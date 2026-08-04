# Per-Project Context — Tier 1 Entry Point

> **This file is auto-loaded by opencode when working in this project.**
> It is the index for the project's information hierarchy.
> Point me at `context/instructions.md` first; everything else is on-demand.

## Project at a glance
- **Name:** Helm
- **One-liner:** Self-hosted options trading toolkit (replaces $100/mo lowstresstrading.com) + personal finance / budget aggregator.
- **Repo:** `~/develop/helm`
- **Owner:** Eric (solo today; multi-user with **ASP.NET Core Identity + SSO** planned for the future — see "Future state" in `context/instructions.md`)
- **Phase:** ship (MVP calculator deployed at `helm.ericstermer.com` via `/opt/homelab/helm`)
- **MVP:** Return projection calculator — weekly earnings %, starting balance, weekly contribution, weekly (300 rows) or yearly (10 rows) projection. Compounds weekly. Option-selling income framing.

## Architecture
Clean architecture (4 projects) + vertical slices (features dirs in each layer):
- `Helm.Domain` — pure types, no deps. `Projections/{ProjectionMode,ProjectionRow}.cs`.
- `Helm.Application` — use cases. `Projections/IProjectionCalculator.cs` + implementation, request/result records. `DependencyInjection.cs` exposes `AddApplication()`.
- `Helm.Infrastructure` — tech adapters. Currently empty (placeholder for Postgres / EF Core). `DependencyInjection.cs` exposes `AddInfrastructure()`.
- `Helm.Api` — HTTP. `Features/Projections/ProjectionsController.cs`. `Program.cs` wires `AddApplication()` + `AddInfrastructure()`.
- `Helm.Web` — React Admin SPA. `src/pages/Projections.tsx` is the calculator page.
- `src/Directory.Packages.props` — Central Package Management. All NuGet versions live here; csproj `<PackageReference>` entries are versionless.

## Stack
- **Language / runtime:** .NET 10 (LTS, supported through Nov 2028) — 4 projects in `Helm.slnx`
- **Backend:** ASP.NET Core Web API. RESTful, JSON.
- **Frontend:** React Admin SPA (Vite). Built static, served by the API.
- **Routing:** UI from `/`, REST API at `/api/*`. Single container, single port.
- **DB / storage:** TBD (Postgres planned for tracking/budget phase — will live in Infrastructure)
- **Infra / deploy:** Docker (compose), deployed to `/opt/homelab/helm` behind `traefik`. Local dev in same compose pattern.
- **Local dev:** `dotnet run` for API; `npm run dev` for SPA hitting the API.

## Build / verify
- **RESTORE all:** `dotnet restore src/Helm.slnx`
- **Build all:** `dotnet build src/Helm.slnx`
- **API dev:** `dotnet run --project src/Helm.Api --urls http://localhost:5030`
- **SPA dev:** `npm run dev --prefix src/Helm.Web` (API must be running on 5030)
- **Full prod build:** `docker build -t helm:local .`
- **Run container:** `docker run --rm -p 5030:8080 helm:local`
- **Lint:** `npm run lint --prefix src/Helm.Web`
- **Production wire-up:** SPA `dist/` is copied into API `wwwroot/` during `docker build`. Single port (8080) serves both `/` (SPA) and `/api/*` (REST).

## Tier 2 — read these when relevant
- `context/instructions.md` — master instructions, voice rules, hard don'ts
- `context/voice.md`        — project-specific voice deltas (vs Tier 0 `about-voice.md`)
- `context/references/`     — SOPs, transcripts, research (lazy load)
- `context/examples/`       — 3–5 good examples of what "done" looks like
- `context/notes.md`        — running notes, decisions, lessons learned

## Behavior rules (override Tier 0 for this project only)
- Solo personal project today — no shared secrets, no third-party APIs without Eric's sign-off.
- All credentials read from `~/.env` or homelab `.env` (never committed).
- Anything trading-related: real money at risk. No paper-trading shortcuts masquerading as production code.
- Vertical slice convention: each new tool/feature gets a folder in Domain, Application, Infrastructure (when needed), and Api. New DI extension methods (`AddApplication()`, `AddInfrastructure()`) per feature are fine but optional.
- NuGet versions live in `src/Directory.Packages.props` only. Never put a `Version=` attribute on a `<PackageReference>` in a csproj.
- **Don't bake in single-user assumptions.** No `StaticCurrentUser` globals, no "your account" API keys as a stand-in for auth, no owner-less entities. When Postgres lands, every entity gets an `OwnerId` from day one even if there's only one user today. Future state documented in `context/instructions.md` under "Future state."

## Agent autonomy defaults
- Default mode: build
- Default model: see global config
- Permissions: see global `~/.config/opencode/opencode.jsonc`

## Refresh cadence
- `instructions.md` — when goals / hard rules change
- `voice.md`        — when examples reveal a new pattern
- `examples/`       — every 3–5 completed tasks, add a good one
- `notes.md`        — end of each session, append 1–3 bullets
