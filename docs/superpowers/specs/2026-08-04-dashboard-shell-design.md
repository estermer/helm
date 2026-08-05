# Dashboard Shell — Design Spec

**Date:** 2026-08-04
**Status:** Approved (brainstorming complete)
**Repo:** `~/develop/helm`
**Scope:** SPA shell only. No backend changes.

## Goal

Replace the single-page SPA (today: the calculator is the entire app) with a proper shell: left sidebar, dashboard home, calculator as a first-class route, login page stub, and a public/auth model that's forward-compatible with the planned multi-user phase.

## Non-goals

- No authentication implementation. Login is a stub.
- No new tools, no new API endpoints.
- No theming, branding, dark mode, or logo.
- No persistence. No database.
- No changes to the calculator's behavior, math, or UI.

## Constraints (project-wide)

- Calculator stays public forever. No auth gate. (Per `context/instructions.md` — the calculator is stateless.)
- Multi-user with ASP.NET Core Identity is the planned future. This slice must not block that.
- No new dependencies. Use what React Admin and MUI already ship.
- Single container, single port — SPA built statically, served by the API from `/`. Already true today.

## Public vs authenticated model

### Today (this slice)

| Surface | Route | Status |
|---|---|---|
| Dashboard home | `/` | Public |
| Calculator | `/calculator` | Public |
| Login stub | `/login` | Public |
| `/api/projections` | API | Public |

Nothing is gated. `requireAuth={false}` stays on `<Admin>`.

### Forward path (when auth lands)

| Surface | Status | Mechanism |
|---|---|---|
| Dashboard home | Public | Unchanged |
| Calculator | Public | Unchanged. `<AuthGuard>` does not wrap it. |
| Login, Logout, Register | Public | Must be reachable unauthenticated |
| Future: Tracking, Budget, etc. | Gated | Wrapped in `<AuthGuard>` on `<CustomRoutes>`. Deferred. |
| `dataProvider` | Gated | Requests carry auth cookie/JWT. Deferred. |

Gated nav items appear in the sidebar only when authenticated. Public items always show. Implementation deferred to the auth slice.

## Architecture

### Approach

React Admin–native: custom `<Menu>`, `<CustomRoutes>`, and `dashboard` slot. RA's `<Admin>` shell is preserved. ~80 lines of new code, no `App.tsx` rewrite beyond wiring.

### File layout

```
src/Helm.Web/src/
  App.tsx                 # rewired: dashboard={<Dashboard />}, menu={AppMenu}, <CustomRoutes>
  pages/
    Dashboard.tsx         # NEW — tool catalog home
    Projections.tsx       # unchanged (still the calculator)
    Login.tsx             # NEW — stub page
  layout/
    AppMenu.tsx           # NEW — wraps RA Menu with Dashboard, Calculator, Login (pinned bottom)
  dataProvider.ts         # unchanged
  types.ts                # unchanged
```

Why:
- `pages/` for route components — matches the existing one-folder-per-page convention.
- `layout/` for shell chrome. Single file because it's small; split if it grows.
- `App.tsx` is the only file that knows about React Admin wiring.

## Components

### `App.tsx` (rewired)

```tsx
<Admin
  dataProvider={dataProvider}
  dashboard={Dashboard}
  requireAuth={false}
  layout={AppLayout}
>
  <CustomRoutes>
    <Route path="/calculator" element={<Projections />} />
    <Route path="/login" element={<Login />} />
  </CustomRoutes>
</Admin>
```

- `dashboard={Dashboard}` replaces `dashboard={Projections}`.
- `layout={AppLayout}` overrides RA's default `<Layout>` with our custom wrapper, which is what makes the custom `<AppMenu>` actually mount in the sidebar (see below).
- `<CustomRoutes>` registers non-Resource routes.
- `requireAuth={false}` stays — no auth yet.

### `AppLayout.tsx` — custom RA Layout wrapper (NEW)

In React Admin 5 the `menu` prop lives on `<Layout>`, not on `<Admin>` — passing `menu={AppMenu}` to `<Admin>` is silently dropped at runtime. To mount a custom sidebar menu, a tiny wrapper component is required:

```tsx
import { Layout } from 'react-admin';
import type { LayoutProps } from 'react-admin';
import { AppMenu } from './AppMenu';

export const AppLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AppMenu} />
);

export default AppLayout;
```

Lives at `src/Helm.Web/src/layout/AppLayout.tsx`. Forwards every other `<Layout>` prop (including children) verbatim; only overrides `menu`.

### `Dashboard.tsx` — tool catalog home

- `<Container maxWidth="lg">` for comfortable line length.
- `<Typography variant="h4">` heading: "Helm".
- `<Typography variant="body1">` subtitle: "Self-hosted options toolkit. Pick a tool to get started."
- `<Grid container spacing={3}>` with one `<Grid size={{ xs: 12, sm: 6, md: 4 }}>` (MUI v9 Grid v2 syntax — the project pulls MUI v9 transitively via React Admin; the legacy `item xs/sm/md` syntax was removed) containing a `<Card>`.
- Card: MUI `<Card>` with `<CardActionArea component={Link} to="/calculator">` wrapping contents. Click navigates to `/calculator` via React Router's `<Link>`.
- Card content: title "Calculator" + one-line description "Project weekly option-selling returns".
- `Calculate` icon from `@mui/icons-material/Calculate` (available transitively, no new dep) decorates the card heading.
- No "coming soon" cards. No widgets. Pure tool catalog.

### `AppMenu.tsx` — sidebar

- Default export is a React component that returns the sidebar markup.
- Outer wrapper is a flex column filling the sidebar height.
- Top group: react-admin's `<Menu.Item to="/" primaryText="Dashboard">`, `<Menu.Item to="/calculator" primaryText="Calculator">`.
- Bottom-pinned: `<Menu.Item to="/login" primaryText="Login">`, wrapped in `<Box sx={{ mt: 'auto' }}>` so flexbox pushes it to the bottom of the sidebar.
- The top items are rendered inside a `<Menu>` component; the bottom-pinned item is rendered inside a separate `<Menu>` wrapped by `<Box sx={{ mt: 'auto' }}>`. (React Admin 5's API: `Menu.Item`, not a top-level `MenuItem` export — `Menu` exposes `Menu.Item = MenuItemLink`. `MenuItemLink` is also exported if a flat list is preferred.)
- Active state: RA's default active-state styling via the `to` prop.
- No collapse, no grouping, no badges.

### `Login.tsx` — stub

- Page root is a `<Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>` so the card sits centered horizontally with top padding.
- `<Card sx={{ maxWidth: 400, width: '100%' }}>`:
  - `<CardContent>`: `<Typography variant="h5">` "Sign in", `<Typography variant="body2">` "Sign-in is coming soon. This page is a placeholder while authentication is being built.", `<Button variant="contained" onClick={() => navigate('/')}>` "Back to dashboard".
- No form, no inputs, no providers, no handlers beyond the back button.

### `Projections.tsx` — unchanged

Existing calculator, mounted at `/calculator` via `<CustomRoutes>` instead of as the `dashboard` slot. Behavior, math, and styling all preserved.

## Routing

| Route | Component | Public | Mounted via |
|---|---|---|---|
| `/` | `Dashboard` | yes | RA `dashboard` slot |
| `/calculator` | `Projections` | yes | `<CustomRoutes>` |
| `/login` | `Login` | yes | `<CustomRoutes>` |
| `/*` (unknown) | RA default | yes | RA catch-all |

## Layout & visual

- Sidebar: default RA width (~240px). Default background.
- Top bar (`<AppBar>`): default RA. No logo, no user menu, no search.
- Dashboard home: `<Container maxWidth="lg">`, `h4` heading, one subtitle line, one-card grid.
- Calculator page: unchanged.
- Login page: centered ~400px card.
- Theming: none. Default MUI/RA light theme. No dark mode, no brand colors in this slice.

## Data flow

This slice has no data flow. Pages are presentational. The only existing fetch (`Projections.tsx → /api/projections`) is untouched.

## Error handling

| Failure | Behavior |
|---|---|
| `/api/projections` errors | Existing `setError()` in `Projections.tsx:50` — unchanged. |
| Unknown route | RA built-in "Not Found" view. Acceptable. |
| Nav click | `useNavigate` doesn't throw on valid routes. Not worth a boundary. |
| Card click | `useNavigate` call. Cannot realistically throw. |

No `ErrorBoundary` added in this slice. No app-level error reporting for chrome-only pages.

## Testing

No automated tests added. The project has no SPA test runner today, and adding one for a 4-component chrome slice is out of proportion.

Manual smoke test (`npm run dev`):

1. `/` shows Dashboard with one Calculator card.
2. Clicking the card lands on `/calculator` and the calculator still works (input → projection).
3. Sidebar items navigate correctly. Active item is highlighted.
4. "Login" in the sidebar lands on `/login` with the stub.
5. "Back to dashboard" returns to `/`.
6. Hard-reload on `/calculator` and `/login` — routes survive.

Build verification:

- `npm run lint --prefix src/Helm.Web` clean.
- `npm run build --prefix src/Helm.Web` clean (also type-checks).
- `docker build -t helm:local .` succeeds; SPA `dist/` is copied into API `wwwroot/` per the existing `Dockerfile`.

## Out of scope (deferred to later slices)

- Real authentication (login, logout, session, cookies/JWT).
- `authProvider.ts` for React Admin.
- `<AuthGuard>` route wrapper.
- Per-resource auth gating (tracking, budget).
- Theming, logo, dark mode.
- Mobile-responsive sidebar drawer (RA's sidebar collapses on small screens via default — verify, but no custom work).
- Any new tools beyond the Calculator card.

## Open questions

None for this slice. All decisions captured above.
