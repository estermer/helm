# Build stage 1: SPA
FROM node:22-bookworm-slim AS spa-build
WORKDIR /app/src/Helm.Web
COPY src/Helm.Web/package.json src/Helm.Web/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY src/Helm.Web/ ./
RUN npm run build

# Build stage 2: API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /app
COPY src/Directory.Packages.props src/
COPY src/Helm.slnx src/
COPY src/Helm.Domain/Helm.Domain.csproj src/Helm.Domain/
COPY src/Helm.Application/Helm.Application.csproj src/Helm.Application/
COPY src/Helm.Infrastructure/Helm.Infrastructure.csproj src/Helm.Infrastructure/
COPY src/Helm.Api/Helm.Api.csproj src/Helm.Api/
RUN dotnet restore src/Helm.slnx
COPY src/Helm.Domain/ src/Helm.Domain/
COPY src/Helm.Application/ src/Helm.Application/
COPY src/Helm.Infrastructure/ src/Helm.Infrastructure/
COPY src/Helm.Api/ src/Helm.Api/
COPY --from=spa-build /app/src/Helm.Web/dist src/Helm.Api/wwwroot
RUN dotnet publish src/Helm.Api/Helm.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api-build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Helm.Api.dll"]
