FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/CloudLens.Api/CloudLens.Api.csproj backend/CloudLens.Api/
RUN dotnet restore backend/CloudLens.Api/CloudLens.Api.csproj
COPY . .
RUN dotnet publish backend/CloudLens.Api/CloudLens.Api.csproj -c Release -o /app/publish /p:UseAppHost=false
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CloudLens.Api.dll"]
