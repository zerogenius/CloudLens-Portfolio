using System.Collections.Concurrent;
using System.Diagnostics;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((ctx, services, config) => config
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());
builder.Services.AddSingleton<TelemetryStore>();
builder.Services.AddSingleton<AlertStore>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options => options.AddPolicy("dashboard", p => p
    .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
    .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseSerilogRequestLogging();
app.UseCors("dashboard");
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.Use(async (context, next) =>
{
    var timer = Stopwatch.StartNew();
    try { await next(); }
    finally
    {
        timer.Stop();
        context.RequestServices.GetRequiredService<TelemetryStore>().Record(new RequestSample(
            DateTimeOffset.UtcNow, context.Request.Method, context.Request.Path.ToString(),
            context.Response.StatusCode, Math.Round(timer.Elapsed.TotalMilliseconds, 2)));
    }
});

app.MapGet("/", () => Results.Ok(new { name = "CloudLens API", version = "1.0.0", docs = "/swagger" }));
app.MapGet("/health/live", () => Results.Ok(new { status = "Healthy", checkedAt = DateTimeOffset.UtcNow }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Ready", checkedAt = DateTimeOffset.UtcNow }));
app.MapGet("/api/metrics", (TelemetryStore store) => Results.Ok(store.Snapshot()));
app.MapGet("/api/requests", (int? limit, TelemetryStore store) => Results.Ok(store.Recent(Math.Clamp(limit ?? 30, 1, 200))));
app.MapGet("/api/alerts", (AlertStore store) => Results.Ok(store.All()));
app.MapPost("/api/alerts", (CreateAlertRequest request, AlertStore store) =>
{
    if (string.IsNullOrWhiteSpace(request.Name)) return Results.ValidationProblem(new Dictionary<string, string[]> { ["name"] = ["Name is required."] });
    if (request.Threshold < 1) return Results.ValidationProblem(new Dictionary<string, string[]> { ["threshold"] = ["Threshold must be at least 1."] });
    var alert = store.Add(request.Name.Trim(), request.Metric, request.Threshold);
    return Results.Created($"/api/alerts/{alert.Id}", alert);
});
app.MapDelete("/api/alerts/{id:guid}", (Guid id, AlertStore store) => store.Remove(id) ? Results.NoContent() : Results.NotFound());
app.Run();

public sealed record RequestSample(DateTimeOffset Timestamp, string Method, string Path, int StatusCode, double DurationMs);
public sealed record MetricsSnapshot(long TotalRequests, long ErrorRequests, double AverageLatencyMs, double ErrorRatePercent, DateTimeOffset GeneratedAt);
public sealed record CreateAlertRequest(string Name, string Metric, double Threshold);
public sealed record AlertRule(Guid Id, string Name, string Metric, double Threshold, bool Enabled, DateTimeOffset CreatedAt);

public sealed class TelemetryStore
{
    private readonly ConcurrentQueue<RequestSample> _samples = new();
    private long _total, _errors, _latencySum;
    public void Record(RequestSample sample)
    {
        Interlocked.Increment(ref _total);
        if (sample.StatusCode >= 500) Interlocked.Increment(ref _errors);
        Interlocked.Add(ref _latencySum, (long)(sample.DurationMs * 100));
        _samples.Enqueue(sample);
        while (_samples.Count > 500) _samples.TryDequeue(out _);
    }
    public MetricsSnapshot Snapshot()
    {
        var total = Interlocked.Read(ref _total); var errors = Interlocked.Read(ref _errors);
        var latency = Interlocked.Read(ref _latencySum) / 100d;
        return new(total, errors, total == 0 ? 0 : Math.Round(latency / total, 2), total == 0 ? 0 : Math.Round(errors * 100d / total, 2), DateTimeOffset.UtcNow);
    }
    public IReadOnlyList<RequestSample> Recent(int limit) => _samples.Reverse().Take(limit).ToArray();
}
public sealed class AlertStore
{
    private readonly ConcurrentDictionary<Guid, AlertRule> _rules = new();
    public IReadOnlyList<AlertRule> All() => _rules.Values.OrderByDescending(x => x.CreatedAt).ToArray();
    public AlertRule Add(string name, string metric, double threshold)
    {
        var rule = new AlertRule(Guid.NewGuid(), name, metric, threshold, true, DateTimeOffset.UtcNow); _rules[rule.Id] = rule; return rule;
    }
    public bool Remove(Guid id) => _rules.TryRemove(id, out _);
}
