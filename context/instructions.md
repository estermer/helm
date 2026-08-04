# Project Instructions — Master Rules

> Loaded on-demand for this project. This file is the project's CLAUDE.md / project-level
> instruction document. It overrides Tier 0 only for this project's sessions.

## What this project is
Self-hosted app that replaces the $100/mo tools Eric currently pays for at lowstresstrading.com. Lead scope is an options trading toolkit (lead tool: a return projection calculator that models option-selling weekly income). Future scope: personal finance / budget aggregator in the same app. Single container, served behind `traefik` at `/opt/homelab/helm`.

## Who it's for
Eric today. Solo personal use, single-user, local network. **Multi-user with SSO + username/password auth is a planned future direction** — do not design code that would block this. When the time comes, all persistent data will be owner-scoped and gated by authentication.

## What "good" looks like
- Clean .NET Web API with RESTful endpoints, JSON in/out, predictable contracts.
- React Admin SPA built statically, served by the API from `/`. API under `/api/*`.
- Single Docker container, single port. Behind `traefik` via labels.
- Replaces the paid tool without trade-offs in usefulness — no faked data, no paper-trading placeholders shipped as production.
- No premature abstractions. Add helpers when needed twice.
- Ship working slices end-to-end before adding the next feature.
- Code written today works as-is when multi-user lands — no rewrites, just additions.

## Hard "don'ts" (project-specific)
- Don't fake or fake-fill trading data — if a value isn't available, surface it.
- Don't introduce dependencies without justification; ask before adding a NuGet or npm package.
- Don't commit `appsettings*.json` with real secrets. Use User Secrets in dev, env vars in container.
- Don't pick a paid options data API without sign-off (defeats the $100/mo savings).
- **Don't bake in single-user assumptions:** no `StaticCurrentUser` globals, no singleton "current account" state, no "your account" API key as a stand-in for auth, no owner-less entities. If it would need to be ripped out when multi-user lands, don't write it that way.
- Don't add auth / SSO / multi-user code until Eric explicitly starts that work. The abstraction placeholders are documentation-only for now.

## Architecture map (high-level)
- Single ASP.NET Core 10 app: serves SPA from `/` (static files in `wwwroot/`), exposes REST endpoints at `/api/*`.
- React Admin (Vite) talks to `/api/*` via a custom data provider; custom views for non-CRUD tools (calculator).
- Postgres for persistent storage (planned for tracking/budget phase) — EF Core in `Helm.Infrastructure`, entities in `Helm.Domain`. The calculator is stateless.
- One `Dockerfile` (multi-stage: build SPA + build API, copy SPA dist into API's `wwwroot/`). One `docker-compose.yml` for local dev.
- Production: `/opt/homelab/helm/` with `docker-compose.yml` + `.env`. Health endpoint at `/health`.
- **Identity/auth layer (planned):** ASP.NET Core Identity is the foundation — `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>` lives in `Helm.Infrastructure/Persistence/`. `ApplicationUser : IdentityUser<Guid>` is a Domain entity. SSO providers register via `AddAuthentication().AddOAuth()` / `AddOpenIdConnect()` on top — native Identity integration. `ICurrentUser` abstraction in `Helm.Application/Common/Interfaces/`, middleware in `Helm.Api/Common/Middleware/`.

## Future state (planned, not implemented)
- **Multi-user** with auth + SSO.
- **Auth provider: ASP.NET Core Identity** (built-in to .NET). User storage, password hashing, roles, claims, MFA, lockout — all from the framework. SSO layers on top via `AddAuthentication().AddOAuth()` / `AddOpenIdConnect()`. No external auth orchestrator (Keycloak, Auth0, etc.) — Identity is the foundation.
- **Identity layer shape:**
  - `Helm.Domain/Identity/ApplicationUser.cs` — `ApplicationUser : IdentityUser<Guid>` (Guid keys, not the default string).
  - `Helm.Infrastructure/Persistence/HelmDbContext.cs` — extends `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>` (or sits alongside; TBD when we wire Postgres).
  - `Helm.Infrastructure/Identity/PasswordHasher.cs` — swaps the default PBKDF2 for Argon2id. Use `Microsoft.Extensions.Identity.Core.Argon2PasswordHasher` (when stable) or `Isopoh.Cryptography.Argon2`.
  - `Helm.Application/Common/Interfaces/ICurrentUser.cs` — abstraction that resolves the authenticated user from the request.
  - `Helm.Api/Common/Middleware/CurrentUserMiddleware.cs` — resolves `HttpContext.User` into `ICurrentUser` for the request scope.
  - `Helm.Api/Features/Auth/` — controllers for `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/external-login`, `/api/auth/external-callback`.
  - `Helm.Web/src/authProvider.ts` — React Admin `authProvider` for the SPA.
- **SSO providers (TBD per launch):** Google, Microsoft, GitHub, Apple. Add via `services.AddAuthentication().AddGoogle().AddMicrosoftAccount().AddGitHub()` — native Identity integration.
- **Don't use Identity's Razor Pages UI** (`/Identity/Account/...`). We have React Admin. The API serves as the auth backend.
- **Token strategy:** TBD. Likely cookie-based auth for the SPA (same-origin) + JWT for API-only consumers (if any later). Cookie auth is simpler given the single-container deploy.
- **First user feature that needs auth:** tracking/budget (positions, trades, accounts, expense categories). The calculator stays stateless — no auth gate today, no auth gate tomorrow.
- **Don't block this:** every persistent entity must have an `OwnerId` from day one; no single-user globals; no "your account" API key as a stand-in. If it would need to be ripped out when multi-user lands, don't write it that way.

## Key files / entry points
- `src/Helm.slnx` — solution file (4 projects).
- `src/Helm.Domain/` — pure types. `Projections/{ProjectionMode,ProjectionRow}.cs`. Future: identity/value objects, persistent entities.
- `src/Helm.Application/` — use cases. `Projections/IProjectionCalculator.cs` + implementation. `DependencyInjection.cs` exposes `AddApplication()`. Future: `Common/Interfaces/ICurrentUser.cs`, request/handler per feature.
- `src/Helm.Infrastructure/` — tech adapters. Currently empty (placeholder for Postgres / EF Core + identity provider). `DependencyInjection.cs` exposes `AddInfrastructure()`.
- `src/Helm.Api/` — HTTP. `Features/Projections/ProjectionsController.cs` is the only controller. `Program.cs` wires `AddApplication()` + `AddInfrastructure()`. Future: `Common/Middleware/` for auth resolver.
- `src/Helm.Web/` — React Admin SPA. `src/pages/Projections.tsx` is the calculator page. `vite.config.ts` proxies `/api` and `/health` to the API in dev. Future: `authProvider.ts` for React Admin.

## Known gotchas
- React Admin is opinionated (CRUD-shaped). Non-CRUD tools (calculator, strategy builder) need custom pages or routes outside the `Resource` model. Don't fight the framework.
- Options market data APIs are mostly paid. Free options (Yahoo, CBOE delayed) are rate-limited or unreliable. The user wants to *avoid* recurring fees — data source decision is critical.
- Traefik container must already be on the `homelab` network for `/opt/homelab/helm` to be served.
- SPA and API need to share the same origin or CORS — the single-container deploy handles this for prod; dev runs Vite on 5173 with proxy to API on 5030.

## Open interview prompts
- [ ] SSO providers: Google, Microsoft, GitHub, Apple — which are needed at launch?
- [ ] Password hashing: `Microsoft.Extensions.Identity.Core.Argon2PasswordHasher` (when stable) vs. `Isopoh.Cryptography.Argon2` (more mature third-party)?
- [ ] Token strategy: cookie-based (same-origin, simpler) vs. JWT (stateless, multi-consumer)?
- [ ] MFA: enable TOTP out of the box, or defer?
- [ ] When to flip from single-user to multi-user? (Trigger: user count, scope creep, partner access?)
- [ ] What's the trigger to start the auth work? (Next feature that needs persistence?)
- [ ] Options data source for any future tool that needs live quotes (Tradier, Polygon, Yahoo, manual CSV?)
- [ ] When do we add the budget side? (Phase 2 trigger)
- [ ] What's the "next three tools" after MVP, in priority order?
