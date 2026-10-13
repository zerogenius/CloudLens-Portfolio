using Xunit;
public class TelemetryStoreTests
{
    [Fact] public void EmptyStoreHasZeroMetrics()
    {
        var store = new TelemetryStore(); var metrics = store.Snapshot();
        Assert.Equal(0, metrics.TotalRequests); Assert.Equal(0, metrics.ErrorRequests); Assert.Equal(0, metrics.AverageLatencyMs);
    }
    [Fact] public void RecordsRequestsAndCalculatesErrorRate()
    {
        var store = new TelemetryStore();
        store.Record(new(DateTimeOffset.UtcNow, "GET", "/health", 200, 10));
        store.Record(new(DateTimeOffset.UtcNow, "GET", "/broken", 500, 30));
        var metrics = store.Snapshot();
        Assert.Equal(2, metrics.TotalRequests); Assert.Equal(1, metrics.ErrorRequests); Assert.Equal(50, metrics.ErrorRatePercent);
        Assert.Equal(2, store.Recent(2).Count);
    }
}
