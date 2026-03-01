# Registration Stats V2 API

## Purpose

Stats v2 introduces an operations-first analytics model with 3 workstreams:

- Private page: `/stats-v2?key=<FOUNDATHON_STATS_PAGE_KEY>`
- API: `GET /api/stats/registrations/v2`
- CSV export API: `GET /api/stats/registrations/v2/export`

Stats v1 remains available and unchanged at `/stats` and `/api/stats/registrations`.

## Security

### Stats API (`/api/stats/registrations/v2`)

- Required header: `x-foundathon-stats-key: <FOUNDATHON_STATS_API_KEY>`
- Missing/invalid key: `401`
- Missing server key config: `500`

### Export API (`/api/stats/registrations/v2/export`)

- Supports API header auth (`x-foundathon-stats-key`) for programmatic use.
- Also accepts page key query auth (`?key=<FOUNDATHON_STATS_PAGE_KEY>`) for private `/stats-v2` UI download actions.
- Missing/invalid auth: `401`
- Missing key configuration: `500`

### Private page (`/stats-v2`)

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

## Query Contract (`/stats-v2` and `/api/stats/registrations/v2`)

All filters are optional; defaults are applied if missing/invalid.

- `section`: `intake | review | quality`
- `view` (legacy alias):
  - `overview | registrations | statements | institutions -> intake`
  - `submissions | approvals | exports -> review`
  - `quality -> quality`
- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`
- `teamType`: `all | srm | non_srm | unknown`
- `approval`: `all | accepted | rejected | submitted | invalid | not_reviewed`
- `statement`: `all | <problemStatementId>`
- `limit`: positive integer, default `20`, max `100`

Behavior:

- `section` takes precedence over legacy `view` if both are present.
- Invalid/missing `section` and `view` default to `intake`.
- Invalid filters are sanitized to defaults.
- If `from > to`, range is normalized (swapped).
- Day bucketing is IST (`Asia/Kolkata`) for date trends and date filters.

## Content Model

### Global Summary

- `Pending Review`
- `Oldest Pending`
- `Pending Submissions`
- `Anomaly Rate`

### Sections

- `intake`: registrations, fill pressure, and recent intake actions
- `review`: pending-review queue and age-band risk
- `quality`: anomaly diagnostics and issue queue

Each section returns:

- `cards`: KPI tiles
- `charts`: chart payloads (`bar | composed | donut | line`)
- `table`: action rows with deterministic columns and sorting metadata

## Response Shape (`GET /api/stats/registrations/v2`)

```ts
type RegistrationStatsV2Response = {
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
    activeSection: "intake" | "review" | "quality";
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
  summary: Array<{
    id: string;
    label: string;
    unit: string;
    value: number | string;
  }>;
  sections: {
    intake: {
      cards: Array<{ id: string; label: string; unit: string; value: number | string }>;
      charts: Array<{
        id: string;
        label: string;
        chartType: "bar" | "line" | "composed" | "donut";
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
    };
    review: {
      cards: Array<{ id: string; label: string; unit: string; value: number | string }>;
      charts: Array<{
        id: string;
        label: string;
        chartType: "bar" | "line" | "composed" | "donut";
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
    };
    quality: {
      cards: Array<{ id: string; label: string; unit: string; value: number | string }>;
      charts: Array<{
        id: string;
        label: string;
        chartType: "bar" | "line" | "composed" | "donut";
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
    };
  };
  exports: {
    datasets: Array<{
      id:
        | "intake_workstream"
        | "review_workstream"
        | "quality_workstream"
        | "blockers_review_overdue"
        | "blockers_pending_submission"
        | "blockers_data_quality";
      label: string;
      description: string;
      section: "intake" | "review" | "quality";
      rowCount: number;
    }>;
  };
};
```

## Export API (`GET /api/stats/registrations/v2/export`)

### Query params

- `dataset` (required):
  - `intake_workstream`
  - `review_workstream`
  - `quality_workstream`
  - `blockers_review_overdue`
  - `blockers_pending_submission`
  - `blockers_data_quality`
- `key` (optional private-page auth path)
- Also accepts same filters as `/api/stats/registrations/v2`:
  - `section` (ignored for dataset selection)
  - `view` (legacy alias; same mapping)
  - `from`, `to`, `teamType`, `approval`, `statement`, `limit`

### Response

- `200 text/csv`
- `Content-Disposition: attachment; filename="foundathon-stats-v2-<dataset>-<YYYY-MM-DD>.csv"`
- Deterministic column order from selected dataset schema

## PII Constraint

The v2 dashboard and exports are action-first but intentionally omit email/phone columns.
Team-level identity is limited to `teamName` and `leadName`.
