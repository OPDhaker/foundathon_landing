import {
  STATS_APPROVAL_FILTERS,
  STATS_LIMIT_DEFAULT,
  STATS_LIMIT_MAX,
  STATS_TEAM_TYPE_FILTERS,
  type StatsApprovalFilter,
  type StatsTeamTypeFilter,
} from "@/app/stats/stats-filters";
import { isStatsView, type StatsView } from "@/app/stats/stats-views";
import {
  mapLegacyStatsViewToSection,
  parseStatsV2Section,
  STATS_V2_DEFAULT_SECTION,
  type StatsV2Section,
} from "./stats-v2-sections";

export type StatsV2QueryInput = {
  approval: StatsApprovalFilter;
  from: string | null;
  legacyView: StatsView | null;
  limit: number;
  section: StatsV2Section;
  statement: string;
  teamType: StatsTeamTypeFilter;
  to: string | null;
};

type RawStatsV2Query = Record<string, string | string[] | undefined>;

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

const parseLegacyView = (
  value: string | string[] | undefined,
): StatsView | null => {
  const normalized = toSingleSearchParam(value)?.trim();
  return isStatsView(normalized) ? normalized : null;
};

export const parseStatsV2QueryInput = (
  params: RawStatsV2Query,
): StatsV2QueryInput => {
  const legacyView = parseLegacyView(params.view);
  const mappedSection = mapLegacyStatsViewToSection(legacyView);
  const explicitSection = parseStatsV2Section(
    toSingleSearchParam(params.section),
  );
  const hasExplicitSection =
    typeof toSingleSearchParam(params.section) === "string" &&
    toSingleSearchParam(params.section)?.trim().length !== 0;
  const section = hasExplicitSection
    ? explicitSection
    : (mappedSection ?? STATS_V2_DEFAULT_SECTION);

  const from = parseDateFilter(params.from);
  const to = parseDateFilter(params.to);
  const normalizedRange = normalizeDateRange({ from, to });

  return {
    approval: parseApprovalFilter(params.approval),
    from: normalizedRange.from,
    legacyView,
    limit: parseLimitFilter(params.limit),
    section,
    statement: parseStatementFilter(params.statement),
    teamType: parseTeamTypeFilter(params.teamType),
    to: normalizedRange.to,
  };
};

export const parseStatsV2QueryInputFromUrl = (
  searchParams: URLSearchParams,
): StatsV2QueryInput => {
  const raw: RawStatsV2Query = {};
  for (const [key, value] of searchParams.entries()) {
    raw[key] = value;
  }

  return parseStatsV2QueryInput(raw);
};

export const buildStatsV2SearchParams = ({
  filters,
  key,
  section,
}: {
  filters: Omit<StatsV2QueryInput, "legacyView" | "section">;
  key?: string;
  section?: StatsV2Section;
}) => {
  const params = new URLSearchParams();
  if (key && key.trim().length > 0) {
    params.set("key", key.trim());
  }

  params.set("section", section ?? STATS_V2_DEFAULT_SECTION);
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
