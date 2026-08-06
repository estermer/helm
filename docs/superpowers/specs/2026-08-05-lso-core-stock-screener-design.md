# LSO Core Stock Screener — Design Spec

**Date:** 2026-08-05
**Status:** Approved (brainstorming complete)
**Repo:** `~/develop/helm`
**Scope:** Add a stateless stock screener page to Helm that filters a curated ticker list against the LSO Core Strategy criteria. Pure backend-orchestration + SPA slice. No DB, no auth.

## Goal

Add a "LSO Core Screener" tool to Helm that finds stocks meeting the LSO Core Strategy criteria in seconds. The page lives at `/screener`, accessible from the dashboard and the sidebar. The screener is stateless, public, and fast on warm scans. It uses Finnhub's free tier for data and a built-in curated universe of tickers.

LSO Core criteria (defaults shown; all six are user-editable in the UI):

| Field | Default | Constraint |
|---|---|---|
| Min Price | $10 | integer ≥ 1 |
| Max Price | $50 | integer > Min Price, ≤ 10000 |
| Max RSI | 40 | select: 30, 35, 40 |
| Max BB % | 33 | number 0–100 |
| Min Put Return % | 1.00 | select: 0.8, 1.0, 1.25 |
| Days to Earn | 10 | integer 1–60 |

Each result row shows: ticker, name, current price, RSI, BB %, Put Return %, Next Earning Date.

## Non-goals

- Persistence. No Postgres, no auth, no OwnerId. Matches the calculator's stateless model.
- Saved presets, saved scans, watchlists. (Stateless: scans are ephemeral.)
- Click-through to a per-ticker detail page. Rows are informational.
- Multi-user. Calculator and screener both stay public. Auth wraps future per-user tools.
- A second data source. If Finnhub is down, the scan fails.
- Real-time streaming (SignalR / WebSocket). Polling is fine.
- Theming, branding, dark mode.

## Constraints (project-wide)

- Single-user today, ASP.NET Core Identity planned for the future. This slice must not block that — no `StaticCurrentUser`, no singleton global state, no API-key-as-auth.
- Calculator stays public. The screener follows the same rule.
- No new dependencies without justification. This slice adds `Microsoft.Extensions.Caching.Memory` (built-in), `IHttpClientFactory` (built-in), and the test runner stack (xUnit + FluentAssertions, see Testing section).
- No paid options data API. Finnhub free tier only.
- Single container, single port. Already true.
- Vertical slice convention: each new feature gets a folder in Domain, Application, Infrastructure (when needed), and Api. New DI extension methods (`AddApplication()`, `AddInfrastructure()`) per feature are fine.

## Architecture

Vertical slice across the four clean-arch layers + SPA. Follows the existing `Projections` pattern exactly.

```
src/Helm.Domain/Screening/
  ScreenerCriteria.cs              # record: 6 fields, defaults baked in
  ScreenerResultRow.cs             # record: Ticker, Name, Price, RSI, BB%, PutReturnPct, NextEarningDate
  ScreeningStatus.cs               # enum: Pending, Running, Completed, Failed
  ScanSnapshot.cs                  # record: Status, CompletedCount, TotalCount, Rows, StartedAt, FinishedAt, Error
  Quote.cs                         # record: Price (decimal)
  Candle.cs                        # record: Date (DateOnly), Close (decimal)
  PutOption.cs                     # record: Strike (decimal), Expiration (DateOnly), Bid (decimal)

src/Helm.Application/Screening/
  IScreeningDataProvider.cs        # abstraction over Finnhub
  IStockUniverse.cs                # abstraction over the curated list
  ILsoScreener.cs                  # StartScan(ScreenerCriteria) -> Guid ; GetSnapshot(Guid) -> ScanSnapshot?
  LsoScreener.cs                   # orchestration: per ticker, fetch + classify + accumulate
  IScanRegistry.cs                 # abstraction over the in-memory scan store
  CriteriaEvaluator.cs             # pure: applies criteria to a single ticker snapshot
  Indicators/                      # pure math (no I/O)
    WilderRsi.cs                   # 14-period RSI from closes
    BollingerBandPercent.cs        # %B = (close - lower) / (upper - lower) * 100
    PutReturnOnRisk.cs             # bid / strike * 100

src/Helm.Infrastructure/Screening/
  FinnhubScreeningDataProvider.cs  # IHttpClientFactory -> Finnhub REST
  BuiltInStockUniverse.cs          # static list of ~30-50 tickers
  MemoryCacheScanRegistry.cs       # IMemoryCache implementation

src/Helm.Api/Features/Screening/
  ScreeningController.cs           # POST /api/screener/lso-core -> 202 + {scanId}
                                   # GET  /api/screener/lso-core/{scanId} -> snapshot
src/Helm.Api/Program.cs            # add IHttpClientFactory, register IMemoryCache, AddInfrastructure() wires it up
src/Helm.Api/appsettings.json      # ScreeningDataProvider section: { BaseUrl, ApiKey }

src/Helm.Web/src/
  pages/LsoScreener.tsx            # NEW — the screener page
  types.ts                         # add ScreenerCriteria, ScreenerResultRow, ScanSnapshot
  layout/AppMenu.tsx               # add nav item /screener
  App.tsx                          # add <CustomRoute path="/screener" />
  pages/Dashboard.tsx              # add screener card
```

**Key boundaries:**

- `Helm.Domain` holds pure types (records, enums). No I/O.
- `Helm.Application` orchestrates. The `IScreeningDataProvider` and `IStockUniverse` interfaces live here. `LsoScreener` is the entry point. `CriteriaEvaluator` is pure.
- `Helm.Infrastructure` owns the HTTP client + Finnhub + the curated list + the scan registry. Only place that knows about Finnhub.
- `Helm.Api` is the HTTP shell. `LsoScreener.StartScan` is fire-and-forget; the controller returns 202 immediately.
- `Helm.Web` is presentational.

**One indirection on the scan registry:** keeping `IScanRegistry` in Application means the `LsoScreener` doesn't know whether the backing store is in-memory, Redis, or a DB. Today: `MemoryCacheScanRegistry`. Tomorrow: swap to Postgres/SQLite if scans should survive restarts. The calculator is the same pattern (interface in Application, implementation in Infrastructure).

## Components

### `ScreenerCriteria` (Helm.Domain)

```csharp
public sealed record ScreenerCriteria(
    decimal MinPrice,           // default 10
    decimal MaxPrice,           // default 50
    int MaxRsi,                 // default 40, valid: 30, 35, 40
    decimal MaxBb,              // default 33 (Bollinger %B threshold)
    decimal MinPutReturnPct,    // default 1.00, valid: 0.8, 1.0, 1.25
    int DaysToEarn);            // default 10
```

### `IScreeningDataProvider` (Helm.Application)

```csharp
public interface IScreeningDataProvider
{
    Task<Quote?> GetQuoteAsync(string ticker, CancellationToken ct);
    Task<IReadOnlyList<Candle>> GetDailyCandlesAsync(string ticker, int daysBack, CancellationToken ct);
    Task<IReadOnlyList<PutOption>> GetPutsAsync(string ticker, CancellationToken ct);
    Task<DateOnly?> GetNextEarningDateAsync(string ticker, CancellationToken ct);
    Task<string?> GetCompanyNameAsync(string ticker, CancellationToken ct);
}
```

Records live in `Helm.Domain/Screening/`. `Quote`, `Candle`, `PutOption` are bare data carriers — no behavior. The Application layer doesn't care whether the data came from Finnhub or a CSV.

**Per-ticker fetch in `LsoScreener` for one ticker:**

1. Concurrent fetch: quote + candles + profile + earnings + puts (5 calls in parallel).
2. Compute RSI(14) from candles → if null/missing, skip ticker.
3. Compute BB% from candles → if null/missing, skip ticker.
4. From puts, find the one with target DTE closest to `DaysToEarn` whose ROR ≥ `MinPutReturnPct`. If none, skip.
5. Price in `[$MinPrice, $MaxPrice]`? RSI ≤ `MaxRsi`? BB% ≤ `MaxBb`? Put has match? → include row.
6. Append to scan registry.

### `IStockUniverse` (Helm.Application)

```csharp
public interface IStockUniverse
{
    IReadOnlyList<string> Tickers { get; }
}
```

`BuiltInStockUniverse` returns a hard-coded list of ~30–50 tickers (your starting universe). List lives in `Helm.Infrastructure/Screening/Universe.cs` as a `static readonly string[]`. Single source of truth, easy to edit later.

### `ILsoScreener` (Helm.Application)

```csharp
public interface ILsoScreener
{
    Guid StartScan(ScreenerCriteria criteria);
    ScanSnapshot? GetSnapshot(Guid scanId);
}
```

- `StartScan` synchronously registers a new `ScanSnapshot` with status `Pending`, returns its `Guid`. Then fires the scan work as a background task:
  - `_ = Task.Run(async () => await RunScanAsync(scanId, criteria, ct))` — wraps the whole run in try/catch, sets status `Failed` on exception, sets `Completed` on success.
  - Cancellation via `CancellationTokenSource` per scan (5-min timeout).
- `GetSnapshot` returns null if scan ID is unknown or evicted.

### `IScanRegistry` (Helm.Application)

```csharp
public interface IScanRegistry
{
    Guid Create(int totalCount);
    void TickCompleted(Guid scanId, ScreenerResultRow? row);
    void Finish(Guid scanId, Exception? error);
    ScanSnapshot? Get(Guid scanId);
}
```

`Create` returns a freshly-generated `Guid` (the scan ID) and seeds the registry with an empty `ScanSnapshot{Status=Pending, TotalCount=totalCount, Rows=[]}`. The unique ID is the only caller-visible part; the snapshot is internal until the loop starts producing rows.

The `MemoryCacheScanRegistry` uses `IMemoryCache` with a 5-min absolute expiration for the *scan snapshot*. Concurrency: `IMemoryCache.GetOrCreate` per scan ID; `TickCompleted` updates the entry via `_cache.Set(scanId, snapshot, opts)`. Single-threaded update per scan (the background loop is the only writer). Snapshot is **immutable** — each `TickCompleted` rebuilds a new `ScanSnapshot` with the appended row, which is fine for ≤50 rows.

> **Two distinct uses of `IMemoryCache`.** The `MemoryCacheScanRegistry` caches *scan snapshots* (5-min TTL). The `FinnhubScreeningDataProvider` caches *per-ticker data* (quote/profile 5 min, candles 24 hr, options chain 5 min, earnings 24 hr). They share the same registered `IMemoryCache` instance but use different keys (`("scan", scanId)` vs `("quote", ticker)`, etc.).

### `CriteriaEvaluator` (Helm.Application)

Pure function:

```csharp
public sealed class CriteriaEvaluator
{
    public ScreenerResultRow? TryBuild(
        string ticker, string name, decimal price,
        decimal? rsi, decimal? bbPercent,
        decimal? putReturnPct, DateOnly? nextEarningDate) { ... }
}
```

Returns `null` if any criterion fails. Returns a fully-formed `ScreenerResultRow` if all pass. Pure (no I/O, no state) — trivially unit-testable.

### Indicators (Helm.Application/Screening/Indicators/)

- `WilderRsi.cs` — 14-period RSI via Wilder's smoothing. Returns `decimal?`; null if input has < 14 closes.
- `BollingerBandPercent.cs` — 20-period SMA + 2-σ bands. `bb = (close - lower) / (upper - lower) * 100`. Returns `decimal?`.
- `PutReturnOnRisk.cs` — `bid / strike * 100`. Returns `decimal?`.

All three are pure, ~30 lines each, fully unit-testable.

### SPA — `LsoScreener.tsx`

- Criteria bar at top: 6 `TextField`s / `Select`s with the constraints specified (Min/Max Price with `$` prefix, Max RSI `Select` 30/35/40, Max BB plain number, Min Put ROR `Select` 0.8/1.0/1.25, Days to Earn plain number).
- "Run scan" button.
- Scan progress: `completedCount / totalCount` + a `<LinearProgress>`.
- Results table: Ticker, Name, Price, RSI, BB%, Put ROR %, Next Earning Date. Each row = one ticker that passed.
- Polling: `useEffect` polls `/api/screener/lso-core/{scanId}` every ~1s while status is `Pending`/`Running`. Renders rows as they arrive. Stops when status is `Completed` or `Failed`.
- Error state: if status is `Failed`, show the failure message.

## Data flow

### Happy path

```
User                SPA                     Controller              LsoScreener           ScanRegistry       Finnhub
 │                  │                          │                       │                      │                  │
 │  click "Run"     │                          │                       │                      │                  │
 │ ───────────────► │  POST /api/screener/     │                       │                      │                  │
 │                  │  lso-core                │                       │                      │                  │
 │                  │  {criteria}              │                       │                      │                  │
 │                  │ ───────────────────────► │  StartScan(criteria)  │                      │                  │
 │                  │                          │ ────────────────────► │  Create(totalCount)  │                  │
 │                  │                          │                       │ ───────────────────► │                  │
 │                  │                          │                       │  returns scanId      │                  │
 │                  │                          │                       │ ◄─────────────────── │                  │
 │                  │                          │                       │  Task.Run(RunScan)   │                  │
 │                  │                          │ ◄────────────────── │                      │                  │
 │                  │  202 Accepted            │                       │                      │                  │
 │                  │  Location: .../scanId   │                       │                      │                  │
 │                  │  { scanId }              │                       │                      │                  │
 │                  │ ◄─────────────────────── │                       │                      │                  │
 │                  │                          │                       │  per ticker (loop):  │                  │
 │                  │                          │                       │  GET /quote ─────────────────────────────────────►│
 │                  │                          │                       │  GET /stock/candle ─────────────────────────────►│
 │                  │                          │                       │  GET /stock/profile2 ────────────────────────────►│
 │                  │                          │                       │  GET /calendar/earnings ──────────────────────────►│
 │                  │                          │                       │  GET /stock/option-chain ──────────────────────────►│
 │                  │  poll every 1s           │                       │  (concurrent)        │                  │
 │                  │                          │                       │                      │                  │
 │                  │  GET /api/screener/      │                       │                      │                  │
 │                  │  lso-core/{scanId}       │                       │                      │                  │
 │                  │ ───────────────────────► │  GetSnapshot(scanId)  │                      │                  │
 │                  │                          │ ────────────────────► │  ──────────────────► │                  │
 │                  │                          │                       │  snapshot            │                  │
 │                  │                          │ ◄─────────────────── │ ◄────────────────── │                  │
 │                  │  200 OK                  │                       │                      │                  │
 │                  │  { status, ...rows }     │                       │                      │                  │
 │                  │ ◄─────────────────────── │                       │  compute, evaluate,  │                  │
 │                  │                          │                       │  TickCompleted(row)  │                  │
 │                  │  (poll again)            │                       │ ───────────────────► │                  │
 │                  │  ...                     │                       │                      │                  │
 │                  │                          │                       │  Finish()            │                  │
 │                  │                          │                       │ ───────────────────► │                  │
 │                  │  GET /.../{scanId}       │                       │                      │                  │
 │                  │  200 OK                  │                       │                      │                  │
 │                  │  { status: Completed,    │                       │                      │                  │
 │                  │    rows: [...] }         │                       │                      │                  │
 │                  │ ◄─────────────────────── │                       │                      │                  │
 │  renders table   │                          │                       │                      │                  │
 │ ◄────────────── │                          │                       │                      │                  │
```

### HTTP contracts

**POST `/api/screener/lso-core`**

- Request body:
  ```json
  {
    "minPrice": 10,
    "maxPrice": 50,
    "maxRsi": 40,
    "maxBb": 33,
    "minPutReturnPct": 1.0,
    "daysToEarn": 10
  }
  ```
- Validation (in controller, before `StartScan`): each field in its valid range. Reject 400 with a flat error message otherwise.
- Response: **202 Accepted**
  ```json
  { "scanId": "11111111-2222-3333-4444-555555555555" }
  ```
  Plus `Location: /api/screener/lso-core/11111111-...`.

**GET `/api/screener/lso-core/{scanId}`**

- Response: **200 OK**
  ```json
  {
    "status": "Running",
    "completedCount": 12,
    "totalCount": 47,
    "startedAt": "2026-08-05T22:00:00Z",
    "finishedAt": null,
    "error": null,
    "rows": [
      { "ticker": "AAPL", "name": "Apple Inc.", "price": 142.50, "rsi": 28.4, "bbPercent": 12.1, "putReturnPct": 1.15, "nextEarningDate": "2026-10-30" }
    ]
  }
  ```
- Response: **404 Not Found** if scan ID is unknown or evicted.

### Timing

- **Cold scan** (no cache): ~50 tickers × 5 calls each = ~250 calls. With 5-way concurrency → ~50 sequential round-trips. Finnhub typical response ~200ms → ~10s wall time. Realistic worst-case: 30s.
- **Warm scan** (cache primed): cache hits are 0-cost against Finnhub. Goal: < 2s total.
- **Cache TTLs** (in `FinnhubScreeningDataProvider`):
  - Quote / profile: 5 min
  - Candles: 24 hr (slow-moving intrinsic value)
  - Options chain: 5 min (more volatile)
  - Earnings calendar: 24 hr

**Per-ticker cache key:** `("quote", ticker)`, `("candles", ticker, daysBack)`, etc. `IMemoryCache` handles storage. No DB needed.

### Polling cadence

- **SPA side**: `setInterval(1000)` while `status` is `Pending` or `Running`. Stops on `Completed` / `Failed`.
- **Abuse protection**: the poll endpoint is cheap (memory cache lookup). No rate limiting needed for one user.

### Lifecycle / cancellation

- Each scan gets a `CancellationTokenSource` with a 5-min absolute timeout, registered in a `ConcurrentDictionary<Guid, CancellationTokenSource>`.
- On scan finish (success or failure), cancel + dispose the CTS.
- On registry eviction (cache TTL), the CTS is disposed via a callback.

### Edge cases

- **Empty result set** (no tickers pass): status is `Completed`, `rows` is `[]`. SPA renders an empty-state message ("No stocks match these criteria").
- **All ticks fail** (e.g. Finnhub down): status is `Failed`, `error` describes the failure. SPA renders an error.
- **Partial Finnhub failure** (e.g. one ticker's options chain returns 500): skip that ticker, log a warning, continue. Tickers are independent.
- **Ticker missing on Finnhub**: skip, log warning, continue.
- **Cache hit during scan**: scan still walks the universe; cached entries return instantly. Total time bounded by the number of cache misses.

## Error handling

Three layers: controller validation, scan-time failures, and SPA presentation. Each error is opaque to the layer above it (controller doesn't know what Finnhub is; SPA doesn't know what Finnhub is).

### Layer 1 — Controller validation

**`POST /api/screener/lso-core`** validates before `StartScan`. Returns 400 with a flat error message.

| Field | Rule | 400 message |
|---|---|---|
| `minPrice` | ≥ 1 | "Min price must be at least $1." |
| `maxPrice` | `>` `minPrice`, ≤ 10000 | "Max price must be greater than min price and at most $10,000." |
| `maxRsi` | one of {30, 35, 40} | "Max RSI must be 30, 35, or 40." |
| `maxBb` | 0–100 | "Max BB % must be between 0 and 100." |
| `minPutReturnPct` | one of {0.8, 1.0, 1.25} | "Min put return must be 0.8, 1.0, or 1.25." |
| `daysToEarn` | 1–60 | "Days to earn must be between 1 and 60." |

**`GET /api/screener/lso-core/{scanId}`** returns 404 if scan ID is unknown. No body needed.

### Layer 2 — Scan-time failures

`ILsoScreener.StartScan` registers the scan, then fires `Task.Run` of the work loop. The work loop catches all exceptions and routes them to the registry.

| Failure | Where caught | Behavior |
|---|---|---|
| One ticker's data fetch throws (timeout, 5xx, parse error) | Inside the per-ticker try/catch in `LsoScreener` | Log warning with ticker + reason. Skip ticker. Continue. |
| All tickers fail | Same try/catch — only one ticker fails to bubble up the loop catches. After loop, all ticks failed → status `Completed` with `rows: []`. | Log warning. Not Failed. |
| Ticker is missing on Finnhub (404, empty payload) | Per-ticker try/catch — treat as a ticker skip. | Log info. |
| `CriteriaEvaluator` returns null (criteria fail) | Per-ticker normal flow. | Skip ticker. Don't log. |
| RSI/BB return null (insufficient history) | Per-ticker normal flow. | Skip ticker. Don't log. |
| Options chain returns no puts in target DTE window | Per-ticker normal flow. | Skip ticker. Don't log. |
| Scan timeout (>5 min) | `CancellationToken` cancellation handler. | Set status `Failed` with `error: "Scan timed out."`. Dispose registry entry. |
| Unhandled exception in the scan loop | Outer `try/catch` in `Task.Run`. | Set status `Failed` with `error: ex.Message`. Log exception. |
| Bad criteria field (e.g. `maxRsi: 38`, not in the allowed set) | Caught by controller validation, never reaches the scanner. | 400. |

**Per-ticker call budget**: each ticker has its own 30s timeout (`HttpClient.Timeout` plus per-call `cts.CancelAfter(30s)`). A slow ticker doesn't block the rest.

### Layer 3 — SPA presentation

The `LsoScreener` page renders based on the snapshot:

| `status` | UI |
|---|---|
| `Pending` / `Running` | Show `<LinearProgress value={completedCount} max={totalCount}>`. Render rows-so-far. Keep polling. |
| `Completed` with `rows: []` | "No stocks match these criteria." with a "Run again" button. |
| `Completed` with rows | Render the full results table. |
| `Failed` | Show red error banner with `error` message. Disable "Run scan" until user changes criteria. |
| Network error during poll | Show inline error on the polling indicator. Continue polling (transient). On 3 consecutive failures, show a banner and stop polling (manual retry button). |

### Logging

- **Helm.Infrastructure** logs at `ILogger<>` (built-in `Microsoft.Extensions.Logging`).
- Levels:
  - `Warning` for per-ticker failures (skip).
  - `Error` for scan-level failures (timeout, unhandled exception).
  - `Information` for scan start/finish (`"Scan {scanId} started — {totalCount} tickers"`, `"Scan {scanId} finished in {durationMs}ms — {passedCount} passed"`).
- **No PII / no API keys in logs.** Logger filters out the Finnhub `token` query parameter.

### What's NOT in scope

- **No retry/failover** to a second data source. If Finnhub is unreachable, the scan fails. (Trivial to add later if needed.)
- **No persistent error log.** Errors are in stdout/stderr (captured by docker). For a single-user homelab app, that's enough.
- **No rate-limit handling** beyond per-call cancellation. If Finnhub rate-limits us, the call returns 429, the per-ticker try/catch skips that ticker, the loop continues. We don't back off.

## Testing

### Recommendation

Add a test project (`tests/Helm.Application.Tests/`) for pure math + evaluator + one stub-driven orchestrator test. xUnit, FluentAssertions, no mocking framework.

Rationale: the project's other slices (calculator, dashboard shell) skipped automated tests entirely — the codebase is at MVP-ship-fast cadence. This slice is different because it has **pure math that benefits hugely from unit tests** (RSI/BB miscalculation is silent; the screener would just give wrong results). Limiting scope to Application keeps the value-to-cost ratio high.

### Project layout

```
tests/Helm.Application.Tests/
  Helm.Application.Tests.csproj         # xUnit, FluentAssertions
  Indicators/
    WilderRsiTests.cs                   # 14-period case, insufficient-history case, edge cases
    BollingerBandPercentTests.cs        # 20-period case, %B clamped, insufficient-history case
    PutReturnOnRiskTests.cs             # basic case, zero bid, zero strike
  CriteriaEvaluatorTests.cs             # all 6 criteria, happy path, each field alone fails
  LsoScreenerTests.cs                   # with stub IScreeningDataProvider + IScanRegistry,
                                        # the screener walks the universe and produces the right rows
```

### Key test cases

**`WilderRsiTests`**

- 14 candles trending down → RSI < 30
- 14 candles trending up → RSI > 70
- 14 identical candles → RSI = 50 (or undefined → null)
- 13 candles → null (insufficient history)
- Known fixture: 14 closes with a known expected RSI value (computed by hand or imported from a reference impl)

**`BollingerBandPercentTests`**

- 20 closes trending up → bb > 100 (close above upper)
- 20 closes trending down → bb < 0 (close below lower)
- 20 closes at the SMA → bb = 50
- 19 closes → null

**`PutReturnOnRiskTests`**

- bid=1.00, strike=50 → 2.0
- bid=0.50, strike=100 → 0.5
- bid=0 → 0
- strike=0 → null (guard div-by-zero)

**`CriteriaEvaluatorTests`**

- All 6 fields pass → returns row
- Each field alone fails → returns null (6 tests, one per criterion)
- Empty/optional fields (e.g. `nextEarningDate = null`) → doesn't disqualify (earning date isn't a criterion)

**`LsoScreenerTests`**

- One test: stub `IScreeningDataProvider` returns canned data for 3 tickers (one passes, one fails on price, one fails on ROR). Stub `IScanRegistry` records `TickCompleted` calls. Assert: scan completes with status `Completed` and registry has exactly the one passing row.

### What's NOT tested (and why)

- **FinnhubScreeningDataProvider** — HTTP integration. Would need a Finnhub sandbox or a mocked `HttpMessageHandler`. Cost is high, value is low (the URL paths are stock Finnhub). Manual smoke test covers it.
- **MemoryCacheScanRegistry** — wraps `IMemoryCache`. Trivial.
- **ScreeningController** — thin wrapper around the screener. Manual smoke test covers it.
- **SPA components** — no React test runner today. Manual smoke test covers it.

### Manual smoke test (`npm run dev` + `dotnet run`)

1. `/screener` page renders. All 6 fields show defaults.
2. Click "Run scan" → progress bar appears → rows appear as scan runs.
3. Wait for completion → table shows passing tickers.
4. Tighten a criterion (e.g. `maxRsi: 30`) → re-run → fewer rows.
5. Set `minPrice: 9999` → re-run → empty state message.
6. Hard-reload mid-scan → SPA loses scan ID → 404 on poll → "scan not found" message (acceptable).
7. Click a ticker row → no action (out of scope; row is informational).
8. Sidebar nav: Dashboard → Calculator → Screener all navigate cleanly.
9. `/api/screener/lso-core` POST with `maxRsi: 38` → 400.
10. `/api/screener/lso-core/{nonexistent-guid}` → 404.

### Build verification

- `dotnet restore src/Helm.slnx` clean.
- `dotnet build src/Helm.slnx` clean.
- `dotnet test src/Helm.slnx` — all green.
- `npm run lint --prefix src/Helm.Web` clean.
- `npm run build --prefix src/Helm.Web` clean.
- `docker build -t helm:local .` succeeds.

**Cost:** one new test project (`tests/Helm.Application.Tests/Helm.Application.Tests.csproj`), new NuGet packages (`xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, `FluentAssertions` — all on the standard xUnit stack). Added to `src/Directory.Packages.props` per the central-package-management rule.

## Dependencies

Approved new packages:

- `tests/Helm.Application.Tests/`: `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, `FluentAssertions`, `coverlet.collector` (optional, for coverage).

Anything else (`IHttpClientFactory`, `IMemoryCache`, `ILogger<T>`, `Microsoft.Extensions.Logging`) is built into the framework — no new package.

## Configuration

`appsettings.json` (committed, no secrets):

```json
{
  "ScreeningDataProvider": {
    "BaseUrl": "https://finnhub.io/api/v1"
  }
}
```

`ScreeningDataProviderOptions` (`BaseUrl` from config; `ApiKey` from env var `FINNHUB_API_KEY` via `IConfiguration["FINNHUB_API_KEY"]` in the composition root). The options class is registered via `services.Configure<ScreeningDataProviderOptions>(builder.Configuration.GetSection("ScreeningDataProvider"))` plus an explicit `screeningDataProviderOptions.ApiKey = builder.Configuration["FINNHUB_API_KEY"] ?? throw ...` step. No secret in `appsettings.json`. No secret in `appsettings.Development.json`.

User Secrets in dev (`dotnet user-secrets set FinnhubApiKey <key> --project src/Helm.Api` sets `FinnhubApiKey`, which the API reads via `builder.Configuration["FinnhubApiKey"]`).

Container: `FINNHUB_API_KEY` in the homelab `.env` file (`chmod 600`). Production reads from env.

**Local-dev fallback:** if `FINNHUB_API_KEY` (or `FinnhubApiKey`) is missing, the API throws at startup with a clear message. Fail-fast at boot is preferred over a runtime 503 — configuration errors are easier to debug this way. The screener endpoint will not be hit if the API doesn't start.

## Out of scope (deferred to later slices)

- Real authentication (login, logout, session, cookies/JWT).
- `authProvider.ts` for React Admin.
- Per-resource auth gating (tracking, budget).
- Persisted scan history, watchlists, saved presets.
- Second data source (failover / paid options API).
- Per-ticker detail page (click-through).
- Theming, logo, dark mode.
- Mobile-responsive sidebar drawer (RA's sidebar collapses on small screens via default — verify, but no custom work).
- Any new tools beyond the Calculator + Screener cards.

## Open questions

- None for this slice. All decisions captured above.
- Universe of tickers: starting list is a placeholder; user will provide the actual ~30-50 tickers to seed `BuiltInStockUniverse` before the implementation plan runs.
