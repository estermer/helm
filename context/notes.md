# Project Notes — Running Log

> Append-only running log. Most recent at the top. Don't rewrite history; the agent
> can read the whole file to see how the project evolved.

## 2026-08-04
- Project scaffolded as `helm`. Repo at `~/develop/helm`, no commits yet.
- Stack chosen: .NET 9 (ASP.NET Core Web API) + React Admin SPA (Vite). API serves UI from `/`; REST at `/api/*`. Single container.
- Deploy target: `/opt/homelab/helm` behind existing `traefik` reverse proxy (homelab `proxy` network, cloudflare certresolver).
- MVP scoped: compound-interest-style return projection calculator framed as option-selling weekly income. Inputs: weekly %, starting balance, weekly contribution, weekly|yearly toggle. Outputs: 300 weekly rows or 10 yearly rows (period #, starting balance, contributions, period income, ending balance).
- Rate dropdown: 0.5%–5% in 0.5% steps (matches user's spec).
- Restructured into clean architecture: `Helm.Domain` (pure types), `Helm.Application` (use cases + abstractions), `Helm.Infrastructure` (placeholder for Postgres), `Helm.Api` (HTTP). All under `Helm.slnx`. Each layer features-clipped: `Projections/` lives in each layer as a vertical slice.
- Upgraded to .NET 10 (LTS, supported through Nov 2028). All 4 projects + Dockerfile now target `net10.0` / `mcr.microsoft.com/dotnet/{sdk,aspnet}:10.0`. DI package was already at 10.0.10; no other package changes needed.
- Converted NuGet to Central Package Management: `src/Directory.Packages.props` is the single source of truth for versions; csproj `<PackageReference>` entries are versionless.
- Added VS Code dev loop: `.vscode/launch.json` (`.NET API`, `SPA (Vite)`, `Docker Compose: helm`, full-stack compound), `.vscode/tasks.json` (build-solution, build-spa, docker-build, docker-compose-up/down), `.vscode/settings.json`, `.vscode/extensions.json`. Removed `.vscode/` from .gitignore so these are committed.
- **Future direction committed:** multi-user with **ASP.NET Core Identity** as the auth provider (not Keycloak, not SaaS). SSO layers on top via `AddAuthentication().AddOAuth()` / `AddOpenIdConnect()` — native Identity integration. Updated `AGENTS.md` and `context/instructions.md` to reflect the future state without implementing it. Hard rule: no single-user globals, no `StaticCurrentUser`, no "your account" API key as auth stand-in, no owner-less entities. When Postgres lands, every entity gets an `OwnerId` from day one. The calculator stays stateless — no auth gate there ever.
- **Deployed to /opt/homelab/helm.** `docker-compose.yml` (uses `image: helm:stable`), `.env` (`DOMAIN1=ericstermer.com`, `chmod 600`). Container on `proxy` + `internal` networks, behind existing `traefik`. Verified end-to-end: `https://helm.ericstermer.com/health` → `{"status":"ok"}`, `/` → SPA, `/api/projections` weekly/yearly both return correct payloads. To update: `docker build -t helm:stable ~/develop/helm && cd /opt/homelab/helm && docker compose up -d --force-recreate`.
- Verified end-to-end: API endpoints, SPA build, SPA served by API, Docker image (`helm:local`) builds and runs with `/health`, `/`, `/api/projections` all responding.
- Tier 0 row added to `~/.config/opencode/personal/about-projects.md`.

## <!-- YYYY-MM-DD -->
- <!-- what we did, decided, broke, learned -->
- <!-- meter: README open rate / deploy success / user feedback -->
