# CloudLens — Application Health & Monitoring Portal

A portfolio MVP for monitoring service health, API request activity, and configurable alert rules. Built with ASP.NET Core 8 and Angular.

## Features
- Liveness and readiness endpoints (`/health/live`, `/health/ready`).
- Request telemetry: total requests, error count, average latency, and recent request samples.
- Structured request logging with Serilog.
- Configurable in-memory alert rules and active alert list.
- Angular dashboard with auto-refresh, metric cards, request history, and alert creation.
- xUnit unit tests, Dockerfile, Docker Compose, and GitHub Actions build/test workflow.

## Requirements
- .NET 8 SDK
- Node.js 20.19+ or 22.12+ (Angular 20 requirement)
- Docker Desktop optional

## Run backend
```powershell
cd backend/CloudLens.Api
dotnet restore
dotnet run
```
The API prints its local URL. Swagger is enabled in Development. Endpoints: `/health/live`, `/health/ready`, `/api/metrics`, `/api/requests`, `/api/alerts`.

## Run frontend
```powershell
cd frontend/cloudlens-dashboard
npm install
npm start
```
Open `http://localhost:4200`. The Angular dev server proxies `/api` and `/health` to `http://localhost:5080`; if your backend starts on a different port, update `proxy.conf.json`.

## Run tests
```powershell
cd backend/CloudLens.Api.Tests
dotnet test
```

## Docker
```powershell
docker compose up --build
```

## Current limitations
This is a local-development MVP. Metrics, request history, and alerts are held in memory and reset when the API restarts. It does not yet use Azure Monitor, Application Insights, a persistent database, distributed tracing, or email/SMS notifications. Do not expose the demo service publicly without adding authentication, persistence, rate limiting, and production configuration.
