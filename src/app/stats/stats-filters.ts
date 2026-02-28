import {
  parseStatsView,
  STATS_DEFAULT_VIEW,
  type StatsView,
} from "./stats-views";

export const STATS_LIMIT_DEFAULT = 20;
export const STATS_LIMIT_MAX = 100;

export const STATS_TEAM_TYPE_FILTERS = [
  "all",
  "srm",
  "non_srm",
  "unknown",
] as const;
export type StatsTeamTypeFilter = (typeof STATS_TEAM_TYPE_FILTERS)[number];

export const STATS_APPROVAL_FILTERS = [
  "all",
  "accepted",
  "rejected",
  "submitted",
  "invalid",
  "not_reviewed",
] as const;
export type StatsApprovalFilter = (typeof STATS_APPROVAL_FILTERS)[number];

export type StatsQueryInput = {
  approval: StatsApprovalFilter;
  from: string | null;
  limit: number;
  statement: string;
  teamType: StatsTeamTypeFilter;
  to: string | null;
  view: StatsView;
};

type RawStatsQuery = Record<string, string | string[] | undefined>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toSingleSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseDateFilter = (value: string | string[] | undefined) => {
  const normalized = toSingleSearchParam(value)?.trim() ?? "";
  if (!ISO_DATE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const parseLimitFilter = (value: string | string[] | undefined) => {
  const normalized = toSingleSearchParam(value)?.trim() ?? "";
  if (!normalized) {
    return STATS_LIMIT_DEFAULT;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return STATS_LIMIT_DEFAULT;
  }

  return Math.min(parsed, STATS_LIMIT_MAX);
};

const parseTeamTypeFilter = (
  value: string | string[] | undefined,
): StatsTeamTypeFilter => {
  const normalized = (toSingleSearchParam(value)?.trim() ?? "all") as string;
  if (STATS_TEAM_TYPE_FILTERS.includes(normalized as StatsTeamTypeFilter)) {
    return normalized as StatsTeamTypeFilter;
  }

  return "all";
};

const parseApprovalFilter = (
  value: string | string[] | undefined,
): StatsApprovalFilter => {
  const normalized = (toSingleSearchParam(value)?.trim() ?? "all") as string;
  if (STATS_APPROVAL_FILTERS.includes(normalized as StatsApprovalFilter)) {
    return normalized as StatsApprovalFilter;
  }

  return "all";
};

const parseStatementFilter = (value: string | string[] | undefined) => {
  const normalized = toSingleSearchParam(value)?.trim() ?? "";
  return normalized.length > 0 ? normalized : "all";
};

const normalizeDateRange = ({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}) => {
  if (!from || !to) {
    return { from, to };
  }

  if (from <= to) {
    return { from, to };
  }

  return { from: to, to: from };
};

export const parseStatsQueryInput = (
  params: RawStatsQuery,
): StatsQueryInput => {
  const view = parseStatsView(params.view);
  const from = parseDateFilter(params.from);
  const to = parseDateFilter(params.to);
  const normalizedRange = normalizeDateRange({ from, to });

  return {
    approval: parseApprovalFilter(params.approval),
    from: normalizedRange.from,
    limit: parseLimitFilter(params.limit),
    statement: parseStatementFilter(params.statement),
    teamType: parseTeamTypeFilter(params.teamType),
    to: normalizedRange.to,
    view,
  };
};

export const parseStatsQueryInputFromUrl = (
  searchParams: URLSearchParams,
): StatsQueryInput => {
  const raw: RawStatsQuery = {};
  for (const [key, value] of searchParams.entries()) {
    raw[key] = value;
  }

  return parseStatsQueryInput(raw);
};

export const buildStatsSearchParams = ({
  filters,
  key,
  view,
}: {
  filters: Omit<StatsQueryInput, "view">;
  key?: string;
  view?: StatsView;
}) => {
  const params = new URLSearchParams();
  if (key && key.trim().length > 0) {
    params.set("key", key.trim());
  }

  params.set("view", view ?? STATS_DEFAULT_VIEW);
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  params.set("teamType", filters.teamType);
  params.set("approval", filters.approval);
  params.set("statement", filters.statement);
  params.set("limit", String(filters.limit));
  return params;
};
