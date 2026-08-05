# Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page SPA (calculator-only) with a left-sidebar shell: tool-catalog Dashboard at `/`, Calculator at `/calculator`, Login stub at `/login`, and a public/auth model that's forward-compatible with multi-user.

**Architecture:** React Admin–native. Custom `<Menu>`, `<CustomRoutes>`, and `dashboard` slot. RA's `<Admin>` shell is preserved. No new dependencies. ~80 lines of new code.

**Tech Stack:** React 18.3.1, React Admin 5.15.1, TypeScript ~5.6.2, MUI (transitive), Vite 5. `@mui/icons-material` is installed transitively (v9.2.0); `Calculate` icon is available — use it.

**Spec:** `docs/superpowers/specs/2026-08-04-dashboard-shell-design.md`

## Global Constraints

- Calculator stays public forever. No auth gate.
- No new dependencies (npm or NuGet). Use what React Admin and MUI already ship.
- Single container, single port — SPA built statically, served by the API from `/`. Already true.
- No automated tests for the SPA. Manual smoke + build/lint verification per project convention.
- All work committed to git at task boundaries. No squashing across tasks.
- `requireAuth={false}` stays on `<Admin>`. No auth implementation.
- Backend untouched — no API changes in this slice.

**Working directory for all commands:** `/home/estermer/develop/helm` unless noted.

---

## Task 1: `Dashboard.tsx` — tool catalog home page

**Files:**
- Create: `src/Helm.Web/src/pages/Dashboard.tsx`
- Modify: none
- Test: manual smoke (no automated test runner for SPA)

**Interfaces:**
- Consumes: `Link` from `react-router-dom`, `Container`/`Typography`/`Grid`/`Card`/`CardActionArea`/`CardContent`/`Box` from `@mui/material`, `Calculate` icon from `@mui/icons-material/Calculate`.
- Produces: default export `Dashboard` — a React component for the `/` route.

- [ ] **Step 1: Create the file**

Write `src/Helm.Web/src/pages/Dashboard.tsx` with the following content:

```tsx
import { Link } from 'react-router-dom';
import CalculateIcon from '@mui/icons-material/Calculate';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';

export const Dashboard = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography variant="h4" component="h1" gutterBottom>
      Helm
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
      Self-hosted options toolkit. Pick a tool to get started.
    </Typography>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card>
          <CardActionArea component={Link} to="/calculator">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalculateIcon color="primary" />
                <Typography variant="h6" component="h2">
                  Calculator
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Project weekly option-selling returns.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
  </Container>
);

export default Dashboard;
```

Note: the project pulls MUI v9 transitively via React Admin. The Grid component in v9 uses the Grid v2 API (`size={{ xs, sm, md }}`); the legacy `item xs={...} sm={...} md={...}` props were removed.

- [ ] **Step 2: Type-check**

Run:
```bash
npm run build --prefix src/Helm.Web
```
Expected: completes with no TypeScript errors. (The build script is `tsc -b && vite build`, so a successful run means both type-check and Vite build pass.) Vite will warn that the new file isn't reachable yet — that's fine, it's used in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/Helm.Web/src/pages/Dashboard.tsx
git commit -m "feat(web): add Dashboard home page (tool catalog)"
```

---

## Task 2: `Login.tsx` — stub page

**Files:**
- Create: `src/Helm.Web/src/pages/Login.tsx`
- Modify: none
- Test: manual smoke

**Interfaces:**
- Consumes: `useNavigate` from `react-router-dom`, `Box`/`Card`/`CardContent`/`Typography`/`Button` from `@mui/material`.
- Produces: default export `Login` — a React component for the `/login` route.

- [ ] **Step 1: Create the file**

Write `src/Helm.Web/src/pages/Login.tsx` with the following content:

```tsx
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

export const Login = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        pt: 8,
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign-in is coming soon. This page is a placeholder while
            authentication is being built.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
```

- [ ] **Step 2: Type-check**

Run:
```bash
npm run build --prefix src/Helm.Web
```
Expected: completes with no TypeScript errors. The new file isn't reachable yet — that's fine, it's used in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/Helm.Web/src/pages/Login.tsx
git commit -m "feat(web): add Login stub page"
```

---

## Task 3: `AppMenu.tsx` — sidebar

**Files:**
- Create: `src/Helm.Web/src/layout/AppMenu.tsx`
- Modify: none
- Test: manual smoke

**Interfaces:**
- Consumes: `Menu` from `react-admin` (RA 5's `<Menu>` exposes `Menu.Item` — the per-link component — and `Menu.DashboardMenuItem`/`Menu.ResourceItem` for Resource-based links; use `Menu.Item` for non-Resource routes).
- Produces: default export `AppMenu` — a React component passed to `<Admin menu={AppMenu}>`.

Note: React Admin 5 does **not** export a top-level `MenuItem` named export. The correct API is `<Menu.Item to="/..." primaryText="..." />` (where `Menu.Item === MenuItemLink`). The previous version of this brief used `MenuItem`; the implementer caught this on the first attempt and asked for confirmation before proceeding. This corrected brief uses the canonical `Menu.Item` API.

- [ ] **Step 1: Create the layout directory**

Run:
```bash
mkdir -p src/Helm.Web/src/layout
```

- [ ] **Step 2: Create the file**

Write `src/Helm.Web/src/layout/AppMenu.tsx` with the following content:

```tsx
import { Box } from '@mui/material';
import { Menu } from 'react-admin';

export const AppMenu = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}
  >
    <Menu>
      <Menu.Item to="/" primaryText="Dashboard" />
      <Menu.Item to="/calculator" primaryText="Calculator" />
    </Menu>
    <Box sx={{ mt: 'auto' }}>
      <Menu>
        <Menu.Item to="/login" primaryText="Login" />
      </Menu>
    </Box>
  </Box>
);

export default AppMenu;
```

The outer `<Box>` is a flex column filling the sidebar height. The top `<Menu>` block grows naturally; the bottom `<Menu>` is wrapped in a `<Box sx={{ mt: 'auto' }}>` which flex-pushes it to the bottom of the sidebar. Each `Menu.Item` uses the `to` prop for both navigation and active-state highlighting.

- [ ] **Step 3: Type-check + build**

Run:
```bash
npm run build --prefix src/Helm.Web
```
Expected: completes with no TypeScript errors. Vite emits the SPA to `src/Helm.Web/dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/Helm.Web/src/layout/AppMenu.tsx
git commit -m "feat(web): add AppMenu sidebar with Dashboard, Calculator, Login"
```

---

## Task 4: Wire `App.tsx` and verify end-to-end

**Files:**
- Create: `src/Helm.Web/src/layout/AppLayout.tsx`
- Modify: `src/Helm.Web/src/App.tsx`
- Test: manual smoke (full flow)

**Interfaces:**
- Consumes: `Dashboard` from `./pages/Dashboard`, `Login` from `./pages/Login`, `Projections` from `./pages/Projections`, `AppMenu` from `./layout/AppMenu`, `AppLayout` from `./layout/AppLayout`, `Admin` and `CustomRoutes` from `react-admin`, `Route` from `react-router-dom`.

Note: React Admin 5 places the `menu` prop on `<Layout>`, not on `<Admin>`. Passing `menu={AppMenu}` to `<Admin>` is silently dropped at runtime — both rejected by `tsc` and a runtime no-op. The correct integration is to pass a custom `<Layout>` via `layout={AppLayout}`. This brief was corrected after the first dispatch: a new `AppLayout.tsx` file is added that wraps `<Layout menu={AppMenu} {...props} />`.

- [ ] **Step 1: Create `AppLayout.tsx`**

Create `src/Helm.Web/src/layout/AppLayout.tsx` with the following content:

```tsx
import { Layout } from 'react-admin';
import type { LayoutProps } from 'react-admin';
import { AppMenu } from './AppMenu';

export const AppLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AppMenu} />
);

export default AppLayout;
```

Forwards every other `<Layout>` prop (including `children`) verbatim; only overrides `menu`. The `LayoutProps` type from `react-admin` covers `appBar`, `sidebar`, `menu`, `title`, etc. — we only need to swap `menu`.

- [ ] **Step 2: Rewrite `App.tsx`**

Replace the contents of `src/Helm.Web/src/App.tsx` with:

```tsx
import { Admin, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { Projections } from './pages/Projections';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { AppLayout } from './layout/AppLayout';
import { dataProvider } from './dataProvider';

const App = () => (
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
);

export default App;
```

This replaces the previous `dashboard={Projections}` with `dashboard={Dashboard}`, adds `layout={AppLayout}` (which is what actually mounts `AppMenu` in the sidebar), and registers `/calculator` and `/login` as `<CustomRoutes>`.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint --prefix src/Helm.Web
```
Expected: clean exit (no errors, no warnings).

- [ ] **Step 4: Type-check + build**

Run:
```bash
npm run build --prefix src/Helm.Web
```
Expected: completes with no TypeScript errors. Vite emits the SPA to `src/Helm.Web/dist/`.

- [ ] **Step 5: Manual smoke test in dev**

Run the API and SPA in dev:
```bash
dotnet run --project src/Helm.Api --urls http://localhost:5030 &
npm run dev --prefix src/Helm.Web
```

Then in a browser at `http://localhost:5173/`:

1. `/` renders the Dashboard: heading "Helm", subtitle, and one card titled "Calculator" with a calculate icon and the description "Project weekly option-selling returns."
2. Clicking the Calculator card navigates to `/calculator` and the calculator works as before (enter inputs → projection table renders).
3. The left sidebar shows three items: Dashboard, Calculator, Login. Login is pinned at the bottom of the sidebar.
4. The active sidebar item is highlighted (Dashboard when on `/`, Calculator when on `/calculator`, Login when on `/login`).
5. Clicking "Login" in the sidebar navigates to `/login` and the stub page renders: title "Sign in", body text about coming soon, "Back to dashboard" button.
6. Clicking "Back to dashboard" returns to `/`.
7. Hard-reload on `/calculator` — the calculator route survives (renders the calculator, not a 404).
8. Hard-reload on `/login` — the login stub route survives.

Stop both processes when done (Ctrl-C each).

- [ ] **Step 6: Commit**

```bash
git add src/Helm.Web/src/layout/AppLayout.tsx src/Helm.Web/src/App.tsx
git commit -m "feat(web): wire Dashboard, Calculator route, Login route, sidebar menu

Adds AppLayout (custom Layout wrapper that mounts AppMenu) since RA 5
places the menu prop on <Layout>, not <Admin>."
```

---

## Task 5: Production build + container verification

**Files:**
- Modify: none (verification only)
- Test: `docker build` + container smoke

**Interfaces:** none — this task is verification.

- [ ] **Step 1: Build the Docker image**

Run:
```bash
docker build -t helm:local .
```
Expected: builds successfully. The Dockerfile copies the SPA `dist/` into the API `wwwroot/` during build.

- [ ] **Step 2: Run the container**

Run:
```bash
docker run --rm -p 5030:8080 helm:local
```
Expected: container starts and listens on `8080` internally, mapped to `5030` on the host.

- [ ] **Step 3: Smoke test the running container**

In another terminal:

```bash
curl -sf http://localhost:5030/health
```
Expected output: `{"status":"ok"}`

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:5030/
```
Expected output: `200`

```bash
curl -sf -X POST http://localhost:5030/api/projections \
  -H "Content-Type: application/json" \
  -d '{"weeklyRate":0.02,"startingBalance":10000,"weeklyContribution":100,"mode":0}' \
  | head -c 200
```
Expected: a JSON response starting with `{"rows":[...`. (Calculator API still works — using numeric enum `0` for Weekly.)

> **Pre-existing API bug discovered during this verification:** `POST /api/projections` with `"mode":"Weekly"` (string) returns HTTP 400 — `ProjectionMode` is currently configured for numeric enum values. The API itself computes correctly; this is a pre-existing JSON enum config issue, not part of the dashboard shell. Flagged for a separate follow-up slice — see `context/notes.md` entry "Pre-existing API bug surfaced by Task 5 verification". When the fix lands, this curl example should switch back to `"mode":"Weekly"` for readability.

In a browser at `http://localhost:5030/`:

1. `/` shows the Dashboard (heading, subtitle, Calculator card).
2. Clicking the card lands on `/calculator` and the calculator still computes correctly.
3. The sidebar shows Dashboard, Calculator, Login. Login is at the bottom.
4. `/login` shows the stub. "Back to dashboard" works.

Stop the container (Ctrl-C in the terminal running `docker run`).

- [ ] **Step 4: No code changes — no commit**

If any smoke step failed, fix and commit before declaring done. If everything passed, this task produces no commit.

---

## Task 6: Update project notes

**Files:**
- Modify: `context/notes.md`
- Test: none (docs only)

- [ ] **Step 1: Append a session note**

Add a new dated section at the top of `context/notes.md` (preserve the existing 2026-08-04 section). The new section is also dated 2026-08-04 (same session, new entry — append the most recent at top per the file's convention). Suggested content:

```markdown
## 2026-08-04 (cont.)
- Shipped dashboard shell slice. SPA now has left-sidebar nav, tool-catalog Dashboard home at `/`, Calculator at `/calculator`, Login stub at `/login`. ~80 lines new code, no new deps, backend untouched. Public/auth model is explicit and forward-compatible with the planned ASP.NET Core Identity phase — the calculator never gets gated. Spec at `docs/superpowers/specs/2026-08-04-dashboard-shell-design.md`, plan at `docs/superpowers/plans/2026-08-04-dashboard-shell.md`.
- Deployed to `/opt/homelab/helm` (rebuild `helm:stable`, `docker compose up -d --force-recreate` per existing flow).
```

- [ ] **Step 2: Commit**

```bash
git add context/notes.md
git commit -m "docs: note dashboard shell slice in project log"
```

---

## Self-Review Notes

**Spec coverage:**
- File layout ✓ (Tasks 1-4)
- App.tsx wiring ✓ (Task 4)
- Dashboard component ✓ (Task 1)
- AppMenu component ✓ (Task 3)
- Login stub ✓ (Task 2)
- Routing table ✓ (Task 4)
- Layout/visual ✓ (Tasks 1-3 markup)
- Data flow / error handling ✓ (no new data flow; error handling unchanged — Task 4 confirms)
- Manual smoke test — HTTP layer only ✓ (Tasks 4 and 5: `curl /health`, `/`, and `/api/projections` against the running container). The visual 8-item browser checklist in Tasks 4 and 5 was NOT performed in a browser (no browser automation tool was available in this session) and is **deferred to the user** to verify locally before shipping.
- Build verification ✓ (Tasks 4 and 5)
- Out-of-scope items correctly omitted (auth, theming, mobile) ✓

**Placeholder scan:** none.

**Type consistency:** `Dashboard`, `Login`, `AppMenu`, `Projections` all referenced consistently. `<CustomRoutes>` and `<Route>` use the react-router-dom `Route` shape. `MenuItem to="..."` is react-admin's pattern.
