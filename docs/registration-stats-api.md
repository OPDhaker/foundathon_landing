# Registration Stats API

## Purpose

The stats stack is now a unified suite:

- Private page: `/stats?key=<FOUNDATHON_STATS_PAGE_KEY>`
- API: `GET /api/stats/registrations`
- CSV export API: `GET /api/stats/registrations/export`

For the operations-first v2 suite (`/stats-v2`, `/api/stats/registrations/v2`, v2 exports), see [registration-stats-v2-api.md](./registration-stats-v2-api.md).

The page is query-routed (`/stats?view=...`) and backed by one data source (`eventsregistrations` + `details`).

## Security

### Stats API (`/api/stats/registrations`)

- Required header: `x-foundathon-stats-key: <FOUNDATHON_STATS_API_KEY>`
- Missing/invalid key: `401`
- Missing server key config: `500`

### Export API (`/api/stats/registrations/export`)

- Supports API header auth (`x-foundathon-stats-key`) for programmatic use.
- Also accepts page key query auth (`?key=<FOUNDATHON_STATS_PAGE_KEY>`) for private `/stats` UI download actions.
- Missing/invalid auth: `401`
- Missing key configuration: `500`

### Private page (`/stats`)

- Requires query key: `?key=<FOUNDATHON_STATS_PAGE_KEY>`
- Missing/invalid key returns `404`.

## Environment Variables

```env
FOUNDATHON_STATS_API_KEY=<strong-secret>
FOUNDATHON_STATS_PAGE_KEY=<private-page-key>
FOUNDATHON_STATS_EXCLUDED_EMAILS=<comma-separated-emails>
```

Exclusion behavior:

- `opdhaker2007@gmail.com` is always excluded.
- `FOUNDATHON_STATS_EXCLUDED_EMAILS` is merged with default exclusion.
- Matching is normalized with `trim().toLowerCase()`.

## Query Contract (`/stats` and `/api/stats/registrations`)

All filters are optional; defaults are applied if missing/invalid.

- `view`: `overview | registrations | statements | submissions | approvals | institutions | quality | exports`
- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`
- `teamType`: `all | srm | non_srm | unknown`
- `approval`: `all | accepted | rejected | submitted | invalid | not_reviewed`
- `statement`: `all | <problemStatementId>`
- `limit`: positive integer, default `20`, max `100`

Behavior:

- Invalid or missing `view` falls back to `overview`.
- Invalid filters are sanitized to defaults.
- If `from > to`, range is normalized (swapped).
- Day bucketing is IST (`Asia/Kolkata`) for date trends and date filters.

## Views

- `overview`: executive KPIs, fill trend, submission trend, top statements
- `registrations`: daily registrations + cumulative trend, hourly timeline, hour-of-day distribution, team-type distribution
- `statements`: registrations vs capacity, fill-rate by statement
- `submissions`: submitted vs pending and submission trend
- `approvals`: approval distribution and queue age bands
- `institutions`: SRM vs external and institution/club distribution
- `quality`: anomaly composition and issue distribution
- `exports`: available export datasets and row counts

## Response Shape (`GET /api/stats/registrations`)

```ts
type RegistrationStatsResponse = {
  generatedAt: string;
  event: {
    eventId: string;
    eventTitle: string;
    statementCap: number;
    totalStatements: number;
    totalCapacity: number;
  };
  filters: {
    excludedRegistrationEmails: string[];
    excludedRows: number;
    includedRows: number;
  };
  meta: {
    activeView:
      | "overview"
      | "registrations"
      | "statements"
      | "submissions"
      | "approvals"
      | "institutions"
      | "quality"
      | "exports";
    appliedFilters: {
      from: string | null;
      to: string | null;
      teamType: "all" | "srm" | "non_srm" | "unknown";
      approval:
        | "all"
        | "accepted"
        | "rejected"
        | "submitted"
        | "invalid"
        | "not_reviewed";
      statement: string;
      limit: number;
    };
    totalRowsBeforeFilters: number;
    totalRowsAfterFilters: number;
    generatedAt: string;
    registrationTrendTimezone: "Asia/Kolkata";
    statementOptions: Array<{ id: string; title: string }>;
  };
  views: Record<
    "overview" | "registrations" | "statements" | "submissions" | "approvals" | "institutions" | "quality" | "exports",
    {
      cards: Array<{ id: string; label: string; unit: string; value: number | string }>;
      charts: Array<{
        id: string;
        label: string;
        chartType: "bar" | "line" | "composed" | "donut";
        xAxisLabelMode?: "default" | "date" | "hour_bucket" | "hour_of_day";
        tooltipLabelMode?: "default" | "date" | "hour_bucket" | "hour_of_day";
        labels: string[];
        series: Array<{ key: string; label: string; data: number[] }>;
      }>;
      table: {
        columns: string[];
        rows: Array<Record<string, number | string | null>>;
        total: number;
        limit: number;
        sort: string;
      };
    }
  >;

  // Compatibility fields retained during transition:
  requiredStats: unknown;
  additionalStats: {
    busiestHourOfDay: string | null; // "00"..."23"
    busiestHourSharePercent: number;
    peakHourBucket: string | null; // "YYYY-MM-DD HH:00" (IST)
    peakHourCount: number;
    registrationByHourOfDay: Array<{
      hour: string; // "00"..."23"
      registrations: number;
      sharePercent: number;
    }>;
    registrationTrendTimezone: "Asia/Kolkata";
    registrationTrendByDate: Array<{ date: string; registrations: number }>;
    registrationTrendByHour: Array<{ hour: string; registrations: number }>;
    // ...existing legacy shape retained
  };
  visualData: unknown;
};
```

Compatibility note:

- `requiredStats`, `additionalStats`, and `visualData` are still returned for backward compatibility.
- New consumers should use `meta` + `views`.

## Export API (`GET /api/stats/registrations/export`)

### Query params

- `dataset` (required):
  - `overview | registrations | statements | submissions | approvals | institutions | quality | exports`
- `key` (optional private-page auth path)
- Also accepts same filters as `/api/stats/registrations`:
  - `view` (ignored for dataset selection)
  - `from`, `to`, `teamType`, `approval`, `statement`, `limit`

### Response

- `200 text/csv`
- `Content-Disposition: attachment; filename="foundathon-stats-<dataset>-<YYYY-MM-DD>.csv"`
- Deterministic column order from selected view table schema

## IST Trend Semantics

- `additionalStats.registrationTrendByDate[].date` uses IST day buckets.
- `additionalStats.registrationTrendByHour[].hour` uses IST hourly buckets (`YYYY-MM-DD HH:00`).
- `additionalStats.registrationByHourOfDay[].hour` is a 24-hour IST bucket (`00`-`23`) aggregated across filtered rows.
- `visualData.charts.registrationTrendByDate.labels` uses IST day labels.
- `additionalStats.registrationTrendTimezone` and `meta.registrationTrendTimezone` are both `Asia/Kolkata`.
