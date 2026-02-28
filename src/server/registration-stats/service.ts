import {
  type StatsQueryInput as ParsedStatsQueryInput,
  STATS_APPROVAL_FILTERS,
  STATS_LIMIT_DEFAULT,
  STATS_LIMIT_MAX,
  STATS_TEAM_TYPE_FILTERS,
  type StatsApprovalFilter,
  type StatsTeamTypeFilter,
} from "@/app/stats/stats-filters";
import {
  parseStatsView,
  STATS_DATASET_VIEW_MAP,
  STATS_EXPORT_DATASETS,
  type StatsExportDataset,
  type StatsView,
} from "@/app/stats/stats-views";
import {
  PROBLEM_STATEMENT_CAP,
  PROBLEM_STATEMENTS,
} from "@/data/problem-statements";
import {
  EVENT_ID,
  EVENT_TITLE,
  type RegistrationRow,
} from "@/lib/register-api";
import { getFoundathonStatsExcludedEmails } from "@/server/env";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";

type ServiceSuccess<T> = {
  data: T;
  ok: true;
  status: number;
};

export type ServiceFailure = {
  error: string;
  ok: false;
  status: number;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

const ok = <T>(data: T, status = 200): ServiceSuccess<T> => ({
  data,
  ok: true,
  status,
});

const fail = (error: string, status: number): ServiceFailure => ({
  error,
  ok: false,
  status,
});

type StatementStats = {
  cap: number;
  fillRatePercent: number;
  isFull: boolean;
  problemStatementId: string;
  registeredTeams: number;
  remainingTeams: number;
  title: string;
};

type TeamType = "non_srm" | "srm" | "unknown";

type TeamTypeBreakdown = {
  percent: number;
  teamType: TeamType;
  teams: number;
};

type ApprovalStatus =
  | "accepted"
  | "invalid"
  | "not_reviewed"
  | "rejected"
  | "submitted";

type ApprovalStatusBreakdown = {
  percent: number;
  status: ApprovalStatus;
  teams: number;
};

type RegistrationTrendEntry = {
  date: string;
  registrations: number;
};

type StatsViewCard = {
  id: string;
  label: string;
  unit: string;
  value: number | string;
};

type StatsViewChart = {
  chartType: "bar" | "composed" | "donut" | "line";
  id: string;
  label: string;
  labels: string[];
  series: Array<{
    data: number[];
    key: string;
    label: string;
  }>;
};

type StatsViewTableCell = number | string | null;

export type StatsViewTableRow = Record<string, StatsViewTableCell>;

type StatsViewPayload = {
  cards: StatsViewCard[];
  charts: StatsViewChart[];
  table: {
    columns: string[];
    limit: number;
    rows: StatsViewTableRow[];
    sort: string;
    total: number;
  };
};

type StatsViewsPayload = Record<StatsView, StatsViewPayload>;

type RegistrationStatsMeta = {
  activeView: StatsView;
  appliedFilters: Omit<ParsedStatsQueryInput, "view">;
  generatedAt: string;
  registrationTrendTimezone: "Asia/Kolkata";
  statementOptions: Array<{
    id: string;
    title: string;
  }>;
  totalRowsAfterFilters: number;
  totalRowsBeforeFilters: number;
};

type RegistrationStatsResponse = {
  additionalStats: {
    anomalies: {
      missingOrInvalidTeamMembers: number;
      missingOrInvalidTeamType: number;
      missingProblemStatementId: number;
      unknownProblemStatementId: number;
    };
    approvalStatusBreakdown: ApprovalStatusBreakdown[];
    firstRegistrationAt: string | null;
    lastRegistrationAt: string | null;
    participation: {
      averageTeamSize: number;
      totalParticipants: number;
    };
    presentationSubmission: {
      pendingTeams: number;
      submissionRatePercent: number;
      submittedTeams: number;
    };
    registrationTrendTimezone: "Asia/Kolkata";
    registrationTrendByDate: RegistrationTrendEntry[];
    teamTypeBreakdown: TeamTypeBreakdown[];
  };
  event: {
    eventId: string;
    eventTitle: string;
    statementCap: number;
    totalCapacity: number;
    totalStatements: number;
  };
  filters: {
    excludedRegistrationEmails: string[];
    excludedRows: number;
    includedRows: number;
  };
  generatedAt: string;
  meta: RegistrationStatsMeta;
  requiredStats: {
    rateOfFilling: {
      capacityTeams: number;
      filledTeams: number;
      overallPercent: number;
      remainingTeams: number;
    };
    registrationsPerProblemStatement: StatementStats[];
    totalTeamsRegistered: number;
  };
  views: StatsViewsPayload;
  visualData: {
    cards: Array<{
      id:
        | "avgTeamSize"
        | "overallFillRate"
        | "pptSubmissionRate"
        | "totalParticipants"
        | "totalTeamsRegistered";
      label: string;
      unit: "members_per_team" | "participants" | "percent" | "teams";
      value: number;
    }>;
    charts: {
      approvalStatusDistribution: {
        chartType: "donut";
        labels: string[];
        series: Array<{ data: number[]; name: "Teams" }>;
      };
      fillRatePerProblemStatement: {
        chartType: "bar";
        labels: string[];
        series: Array<{ data: number[]; name: "Fill Rate %" }>;
      };
      registrationTrendByDate: {
        chartType: "line";
        labels: string[];
        series: Array<{ data: number[]; name: "Registrations" }>;
      };
      registrationsPerProblemStatement: {
        chartType: "bar";
        labels: string[];
        series: Array<{
          data: number[];
          name: "Capacity" | "Registrations";
        }>;
      };
      teamTypeDistribution: {
        chartType: "donut";
        labels: string[];
        series: Array<{ data: number[]; name: "Teams" }>;
      };
    };
  };
};

type StatsRegistrationRow = RegistrationRow & {
  is_approved?: string | null;
  registration_email?: string | null;
};

type RowContext = {
  approvalStatus: ApprovalStatus;
  clubLabel: string | null;
  createdAt: string;
  createdAtIstDate: string | null;
  createdTimestamp: number | null;
  details: Record<string, unknown>;
  hasInvalidTeamMembers: boolean;
  hasPresentation: boolean;
  institutionLabel: string;
  issues: string[];
  leadName: string;
  participants: number;
  statementId: string | null;
  statementTitle: string;
  submissionIstDate: string | null;
  teamName: string;
  teamType: TeamType;
};

export type StatsQueryInput = ParsedStatsQueryInput;
export type RegistrationStatsViewPayload = StatsViewPayload;
export type RegistrationStatsViewChart = StatsViewChart;
export type RegistrationStatsViewTableRow = StatsViewTableRow;

const REGISTRATION_TREND_TIMEZONE = "Asia/Kolkata";
const TEAM_TYPE_ORDER: TeamType[] = ["srm", "non_srm", "unknown"];
const APPROVAL_STATUS_ORDER: ApprovalStatus[] = [
  "accepted",
  "rejected",
  "submitted",
  "invalid",
  "not_reviewed",
];

const DEFAULT_STATS_QUERY_INPUT: ParsedStatsQueryInput = {
  approval: "all",
  from: null,
  limit: STATS_LIMIT_DEFAULT,
  statement: "all",
  teamType: "all",
  to: null,
  view: "overview",
};

const QUALITY_ISSUE_LABELS: Record<string, string> = {
  incomplete_presentation_metadata: "Incomplete presentation metadata",
  missing_lead_data: "Missing lead metadata",
  missing_or_invalid_team_members: "Missing or invalid team members",
  missing_or_invalid_team_type: "Missing or invalid team type",
  missing_problem_statement_id: "Missing problem statement id",
  unknown_problem_statement_id: "Unknown problem statement id",
};

const EXPORT_DATASET_DESCRIPTIONS: Record<StatsExportDataset, string> = {
  approvals: "Review queue and approval states",
  exports: "Dataset availability and export metadata",
  institutions: "Institution and club source breakdown",
  overview: "Executive KPI snapshot and high-level trends",
  quality: "Data quality issue diagnostics",
  registrations: "Daily intake and registration flow",
  statements: "Problem statement capacity and fill",
  submissions: "PPT submission pipeline",
};

const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: REGISTRATION_TREND_TIMEZONE,
  year: "numeric",
});

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeEmail = (email: string | null | undefined) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const normalizeTeamType = (value: unknown): TeamType => {
  if (value === "srm" || value === "non_srm") {
    return value;
  }

  return "unknown";
};

const normalizeApprovalStatus = (value: string | null | undefined) => {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  switch (normalized) {
    case "accepted":
    case "invalid":
    case "rejected":
    case "submitted":
      return normalized;
    default:
      return "not_reviewed";
  }
};

const roundToTwo = (value: number) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

const toDetails = (details: unknown): Record<string, unknown> =>
  isObjectRecord(details) ? details : {};

const toOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toOptionalPositiveInt = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

const getProblemStatementId = (details: Record<string, unknown>) => {
  const value = details.problemStatementId;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const hasPresentationData = (details: Record<string, unknown>) => {
  const textFields = [
    details.presentationPublicUrl,
    details.presentationStoragePath,
    details.presentationUploadedAt,
    details.presentationFileName,
    details.presentationMimeType,
  ];

  if (
    textFields.some(
      (value) => typeof value === "string" && value.trim().length > 0,
    )
  ) {
    return true;
  }

  return (
    typeof details.presentationFileSizeBytes === "number" &&
    Number.isInteger(details.presentationFileSizeBytes) &&
    details.presentationFileSizeBytes > 0
  );
};

const isPresentationMetadataComplete = (details: Record<string, unknown>) =>
  Boolean(
    toOptionalString(details.presentationPublicUrl) &&
      toOptionalString(details.presentationStoragePath) &&
      toOptionalString(details.presentationUploadedAt) &&
      toOptionalString(details.presentationFileName) &&
      toOptionalString(details.presentationMimeType) &&
      toOptionalPositiveInt(details.presentationFileSizeBytes),
  );

const getParticipantsCountAndValidity = (details: Record<string, unknown>) => {
  const lead = details.lead;
  const members = details.members;

  if (!isObjectRecord(lead) || !Array.isArray(members)) {
    return {
      hasInvalidTeamMembers: true,
      participants: 0,
    };
  }

  const validMembers = members.filter((member) => isObjectRecord(member));
  const hasInvalidTeamMembers = validMembers.length !== members.length;

  return {
    hasInvalidTeamMembers,
    participants: 1 + validMembers.length,
  };
};

const getIstDateString = (input: string) => {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  const parts = IST_DATE_FORMATTER.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

const toCumulativeSeries = (values: number[]) => {
  let running = 0;
  return values.map((value) => {
    running += value;
    return running;
  });
};

const getSubmissionIstDateString = ({
  createdAt,
  details,
}: {
  createdAt: string;
  details: Record<string, unknown>;
}) => {
  const rawUploadDate = toOptionalString(details.presentationUploadedAt);
  if (rawUploadDate) {
    const parsedUploadDate = getIstDateString(rawUploadDate);
    if (parsedUploadDate) {
      return parsedUploadDate;
    }
  }

  return getIstDateString(createdAt);
};

const getPendingAgeDays = (timestamp: number | null) => {
  if (timestamp === null) {
    return null;
  }

  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / 86_400_000);
};

const getQueueAgeBand = (pendingDays: number | null) => {
  if (pendingDays === null) {
    return "unknown";
  }

  if (pendingDays <= 1) {
    return "0-1 days";
  }

  if (pendingDays <= 3) {
    return "2-3 days";
  }

  if (pendingDays <= 7) {
    return "4-7 days";
  }

  return "8+ days";
};

const formatSupabaseStatsError = (error: {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string;
}) => {
  const segments = [
    typeof error.code === "string" ? `code=${error.code}` : null,
    typeof error.message === "string" && error.message.trim().length > 0
      ? `message=${error.message}`
      : null,
    typeof error.details === "string" && error.details.trim().length > 0
      ? `details=${error.details}`
      : null,
    typeof error.hint === "string" && error.hint.trim().length > 0
      ? `hint=${error.hint}`
      : null,
  ].filter((segment): segment is string => Boolean(segment));

  return segments.length > 0 ? ` ${segments.join(" | ")}` : "";
};

const normalizeStatsQueryInput = (
  input?: Partial<ParsedStatsQueryInput>,
): ParsedStatsQueryInput => {
  const approvalCandidate = (input?.approval ?? "all") as StatsApprovalFilter;
  const approval = STATS_APPROVAL_FILTERS.includes(approvalCandidate)
    ? approvalCandidate
    : DEFAULT_STATS_QUERY_INPUT.approval;
  const teamTypeCandidate = (input?.teamType ?? "all") as StatsTeamTypeFilter;
  const teamType = STATS_TEAM_TYPE_FILTERS.includes(teamTypeCandidate)
    ? teamTypeCandidate
    : DEFAULT_STATS_QUERY_INPUT.teamType;

  const statement =
    typeof input?.statement === "string" && input.statement.trim().length > 0
      ? input.statement.trim()
      : DEFAULT_STATS_QUERY_INPUT.statement;

  const normalizedFrom =
    typeof input?.from === "string" && input.from.trim().length > 0
      ? input.from.trim()
      : null;
  const normalizedTo =
    typeof input?.to === "string" && input.to.trim().length > 0
      ? input.to.trim()
      : null;

  const limitCandidate = Number.parseInt(String(input?.limit ?? ""), 10);
  const limit =
    Number.isFinite(limitCandidate) && limitCandidate > 0
      ? Math.min(limitCandidate, STATS_LIMIT_MAX)
      : STATS_LIMIT_DEFAULT;

  const view = parseStatsView(input?.view ?? DEFAULT_STATS_QUERY_INPUT.view);

  if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
    return {
      approval,
      from: normalizedTo,
      limit,
      statement,
      teamType,
      to: normalizedFrom,
      view,
    };
  }

  return {
    approval,
    from: normalizedFrom,
    limit,
    statement,
    teamType,
    to: normalizedTo,
    view,
  };
};

const buildRowContext = ({
  row,
  statementIdSet,
  statementTitleById,
}: {
  row: StatsRegistrationRow;
  statementIdSet: Set<string>;
  statementTitleById: Map<string, string>;
}): RowContext => {
  const details = toDetails(row.details);
  const statementId = getProblemStatementId(details);
  const teamType = normalizeTeamType(details.teamType);
  const approvalStatus = normalizeApprovalStatus(row.is_approved);
  const participantsResult = getParticipantsCountAndValidity(details);
  const hasPresentation = hasPresentationData(details);
  const createdTimestamp = new Date(row.created_at).valueOf();
  const createdAtIstDate = getIstDateString(row.created_at);

  const knownStatementTitle =
    statementId && statementIdSet.has(statementId)
      ? (statementTitleById.get(statementId) ?? null)
      : null;
  const statementTitle =
    knownStatementTitle ??
    toOptionalString(details.problemStatementTitle) ??
    (statementId ? `Unknown (${statementId})` : "Unassigned");

  const nonSrmCollege = toOptionalString(details.collegeName);
  const isClub = details.isClub === true;
  const clubLabel = isClub
    ? (toOptionalString(details.clubName) ?? "Unnamed Club")
    : null;

  const institutionLabel =
    teamType === "srm" ? "SRMIST" : (nonSrmCollege ?? "Unknown College");

  const teamName =
    toOptionalString(details.teamName) ?? `Team ${row.id.slice(0, 8)}`;
  const lead = isObjectRecord(details.lead) ? details.lead : null;
  const leadName =
    (lead && toOptionalString(lead.name)) ||
    (teamType === "srm" ? "Unknown SRM Lead" : "Unknown Lead");

  const issues: string[] = [];
  if (!statementId) {
    issues.push("missing_problem_statement_id");
  } else if (!statementIdSet.has(statementId)) {
    issues.push("unknown_problem_statement_id");
  }

  if (teamType === "unknown") {
    issues.push("missing_or_invalid_team_type");
  }

  if (participantsResult.hasInvalidTeamMembers) {
    issues.push("missing_or_invalid_team_members");
  }

  if (!lead) {
    issues.push("missing_lead_data");
  }

  if (hasPresentation && !isPresentationMetadataComplete(details)) {
    issues.push("incomplete_presentation_metadata");
  }

  return {
    approvalStatus,
    clubLabel,
    createdAt: row.created_at,
    createdAtIstDate,
    createdTimestamp: Number.isNaN(createdTimestamp) ? null : createdTimestamp,
    details,
    hasInvalidTeamMembers: participantsResult.hasInvalidTeamMembers,
    hasPresentation,
    institutionLabel,
    issues,
    leadName,
    participants: participantsResult.participants,
    statementId,
    statementTitle,
    submissionIstDate: hasPresentation
      ? getSubmissionIstDateString({ createdAt: row.created_at, details })
      : null,
    teamName,
    teamType,
  };
};

const toViewTable = ({
  columns,
  limit,
  rows,
  sort,
}: {
  columns: string[];
  limit: number;
  rows: StatsViewTableRow[];
  sort: string;
}) => ({
  columns,
  limit,
  rows: rows.slice(0, limit),
  sort,
  total: rows.length,
});

export const getRegistrationStats = async (
  queryInput?: Partial<ParsedStatsQueryInput>,
): Promise<ServiceResult<RegistrationStatsResponse>> => {
  const query = normalizeStatsQueryInput(queryInput);

  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return fail("Stats service role client is not configured.", 500);
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, is_approved, registration_email, details")
    .eq("event_id", EVENT_ID);

  if (error) {
    return fail(
      `Failed to fetch registrations for stats.${formatSupabaseStatsError(
        error,
      )}`,
      500,
    );
  }

  const rows = ((data ?? []) as StatsRegistrationRow[]).filter(
    (row): row is StatsRegistrationRow => Boolean(row),
  );

  const excludedEmails = getFoundathonStatsExcludedEmails();
  const excludedEmailSet = new Set(excludedEmails);

  const includedRows: StatsRegistrationRow[] = [];
  let excludedRows = 0;

  for (const row of rows) {
    const normalizedRegistrationEmail = normalizeEmail(row.registration_email);
    if (
      normalizedRegistrationEmail &&
      excludedEmailSet.has(normalizedRegistrationEmail)
    ) {
      excludedRows += 1;
      continue;
    }

    includedRows.push(row);
  }

  const statementIdSet = new Set(PROBLEM_STATEMENTS.map((item) => item.id));
  const statementTitleById = new Map(
    PROBLEM_STATEMENTS.map((statement) => [statement.id, statement.title]),
  );

  const rowContexts = includedRows.map((row) =>
    buildRowContext({ row, statementIdSet, statementTitleById }),
  );

  const filteredContexts = rowContexts.filter((context) => {
    if (query.teamType !== "all" && context.teamType !== query.teamType) {
      return false;
    }

    if (query.approval !== "all" && context.approvalStatus !== query.approval) {
      return false;
    }

    if (query.statement !== "all" && context.statementId !== query.statement) {
      return false;
    }

    if (query.from) {
      if (!context.createdAtIstDate || context.createdAtIstDate < query.from) {
        return false;
      }
    }

    if (query.to) {
      if (!context.createdAtIstDate || context.createdAtIstDate > query.to) {
        return false;
      }
    }

    return true;
  });

  const totalRowsBeforeFilters = rowContexts.length;
  const totalRowsAfterFilters = filteredContexts.length;

  const statementCounts = new Map<string, number>();
  const teamTypeCounts: Record<TeamType, number> = {
    non_srm: 0,
    srm: 0,
    unknown: 0,
  };
  const approvalStatusCounts: Record<ApprovalStatus, number> = {
    accepted: 0,
    invalid: 0,
    not_reviewed: 0,
    rejected: 0,
    submitted: 0,
  };
  const registrationTrendCounts = new Map<string, number>();
  const submissionTrendCounts = new Map<string, number>();
  const institutionCounts = new Map<string, number>();
  const collegeCounts = new Map<string, number>();
  const clubCounts = new Map<string, number>();
  const pendingByStatementCounts = new Map<string, number>();
  const issueCounts = new Map<string, number>();

  let missingProblemStatementId = 0;
  let unknownProblemStatementId = 0;
  let missingOrInvalidTeamType = 0;
  let missingOrInvalidTeamMembers = 0;
  let totalParticipants = 0;
  let submittedTeams = 0;
  let earliestRegistrationTimestamp: number | null = null;
  let latestRegistrationTimestamp: number | null = null;
  let rowsWithIssues = 0;

  const queueAgeBandCounts: Record<string, number> = {
    "0-1 days": 0,
    "2-3 days": 0,
    "4-7 days": 0,
    "8+ days": 0,
    unknown: 0,
  };

  const pendingReviewRows: Array<
    StatsViewTableRow & { pendingDaysRaw: number }
  > = [];

  for (const context of filteredContexts) {
    if (!context.statementId) {
      missingProblemStatementId += 1;
    } else if (!statementIdSet.has(context.statementId)) {
      unknownProblemStatementId += 1;
    } else {
      statementCounts.set(
        context.statementId,
        (statementCounts.get(context.statementId) ?? 0) + 1,
      );
    }

    teamTypeCounts[context.teamType] += 1;
    if (context.teamType === "unknown") {
      missingOrInvalidTeamType += 1;
    }

    approvalStatusCounts[context.approvalStatus] += 1;

    if (context.hasPresentation) {
      submittedTeams += 1;
      if (context.submissionIstDate) {
        submissionTrendCounts.set(
          context.submissionIstDate,
          (submissionTrendCounts.get(context.submissionIstDate) ?? 0) + 1,
        );
      }
    } else {
      pendingByStatementCounts.set(
        context.statementTitle,
        (pendingByStatementCounts.get(context.statementTitle) ?? 0) + 1,
      );
    }

    totalParticipants += context.participants;
    if (context.hasInvalidTeamMembers) {
      missingOrInvalidTeamMembers += 1;
    }

    if (context.createdTimestamp !== null) {
      if (
        earliestRegistrationTimestamp === null ||
        context.createdTimestamp < earliestRegistrationTimestamp
      ) {
        earliestRegistrationTimestamp = context.createdTimestamp;
      }

      if (
        latestRegistrationTimestamp === null ||
        context.createdTimestamp > latestRegistrationTimestamp
      ) {
        latestRegistrationTimestamp = context.createdTimestamp;
      }
    }

    if (context.createdAtIstDate) {
      registrationTrendCounts.set(
        context.createdAtIstDate,
        (registrationTrendCounts.get(context.createdAtIstDate) ?? 0) + 1,
      );
    }

    institutionCounts.set(
      context.institutionLabel,
      (institutionCounts.get(context.institutionLabel) ?? 0) + 1,
    );

    if (context.teamType === "non_srm") {
      collegeCounts.set(
        context.institutionLabel,
        (collegeCounts.get(context.institutionLabel) ?? 0) + 1,
      );

      if (context.clubLabel) {
        clubCounts.set(
          context.clubLabel,
          (clubCounts.get(context.clubLabel) ?? 0) + 1,
        );
      }
    }

    if (context.issues.length > 0) {
      rowsWithIssues += 1;
      for (const issue of context.issues) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }
    }

    if (context.approvalStatus === "not_reviewed") {
      const pendingDays = getPendingAgeDays(context.createdTimestamp);
      const queueBand = getQueueAgeBand(pendingDays);
      queueAgeBandCounts[queueBand] = (queueAgeBandCounts[queueBand] ?? 0) + 1;

      pendingReviewRows.push({
        createdAt: context.createdAt,
        leadName: context.leadName,
        pendingDays: pendingDays ?? "Unknown",
        pendingDaysRaw: pendingDays ?? Number.MAX_SAFE_INTEGER,
        statement: context.statementTitle,
        teamName: context.teamName,
        teamType: context.teamType,
      });
    }
  }

  const registrationsPerProblemStatement: StatementStats[] =
    PROBLEM_STATEMENTS.map((statement) => {
      const registeredTeams = statementCounts.get(statement.id) ?? 0;
      const remainingTeams = Math.max(
        PROBLEM_STATEMENT_CAP - registeredTeams,
        0,
      );
      const fillRatePercent = roundToTwo(
        (registeredTeams / PROBLEM_STATEMENT_CAP) * 100,
      );

      return {
        cap: PROBLEM_STATEMENT_CAP,
        fillRatePercent,
        isFull: registeredTeams >= PROBLEM_STATEMENT_CAP,
        problemStatementId: statement.id,
        registeredTeams,
        remainingTeams,
        title: statement.title,
      };
    });

  const capacityTeams = PROBLEM_STATEMENT_CAP * PROBLEM_STATEMENTS.length;
  const filledTeams = registrationsPerProblemStatement.reduce(
    (total, item) => total + item.registeredTeams,
    0,
  );
  const remainingTeams = Math.max(capacityTeams - filledTeams, 0);
  const overallPercent = roundToTwo((filledTeams / capacityTeams) * 100);
  const totalTeamsRegistered = filteredContexts.length;

  const teamTypeBreakdown: TeamTypeBreakdown[] = TEAM_TYPE_ORDER.map(
    (teamType) => {
      const teams = teamTypeCounts[teamType];
      return {
        percent:
          totalTeamsRegistered > 0
            ? roundToTwo((teams / totalTeamsRegistered) * 100)
            : 0,
        teamType,
        teams,
      };
    },
  );

  const approvalStatusBreakdown: ApprovalStatusBreakdown[] =
    APPROVAL_STATUS_ORDER.map((status) => {
      const teams = approvalStatusCounts[status];
      return {
        percent:
          totalTeamsRegistered > 0
            ? roundToTwo((teams / totalTeamsRegistered) * 100)
            : 0,
        status,
        teams,
      };
    });

  const registrationTrendByDate = [...registrationTrendCounts.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, registrations]) => ({
      date,
      registrations,
    }));

  const submissionTrendByDate = [...submissionTrendCounts.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, submissions]) => ({
      date,
      submissions,
    }));

  const pendingTeams = totalTeamsRegistered - submittedTeams;
  const submissionRatePercent =
    totalTeamsRegistered > 0
      ? roundToTwo((submittedTeams / totalTeamsRegistered) * 100)
      : 0;

  const averageTeamSize =
    totalTeamsRegistered > 0
      ? roundToTwo(totalParticipants / totalTeamsRegistered)
      : 0;

  const labelsByStatement = registrationsPerProblemStatement.map(
    (item) => item.title,
  );

  const registrationTrendLabels = registrationTrendByDate.map(
    (item) => item.date,
  );
  const registrationTrendValues = registrationTrendByDate.map(
    (item) => item.registrations,
  );
  const registrationCumulativeValues = toCumulativeSeries(
    registrationTrendValues,
  );

  const submissionTrendLabels = submissionTrendByDate.map((item) => item.date);
  const submissionTrendValues = submissionTrendByDate.map(
    (item) => item.submissions,
  );
  const submissionCumulativeValues = toCumulativeSeries(submissionTrendValues);

  const notReviewedTeams = approvalStatusCounts.not_reviewed;
  const acceptedTeams = approvalStatusCounts.accepted;
  const rejectedTeams = approvalStatusCounts.rejected;
  const reviewedTeams = totalTeamsRegistered - notReviewedTeams;
  const reviewCoveragePercent =
    totalTeamsRegistered > 0
      ? roundToTwo((reviewedTeams / totalTeamsRegistered) * 100)
      : 0;

  const fullStatements = registrationsPerProblemStatement.filter(
    (item) => item.isFull,
  ).length;
  const nearCapacityStatements = registrationsPerProblemStatement.filter(
    (item) => !item.isFull && item.fillRatePercent >= 80,
  ).length;

  const overviewRows = [...registrationsPerProblemStatement]
    .sort(
      (a, b) =>
        b.fillRatePercent - a.fillRatePercent ||
        b.registeredTeams - a.registeredTeams ||
        a.title.localeCompare(b.title),
    )
    .map((item) => ({
      capacity: item.cap,
      fillRatePercent: item.fillRatePercent,
      statement: item.title,
      teams: item.registeredTeams,
    }));

  const registrationRows = registrationTrendByDate
    .map((item, index) => ({
      cumulative: registrationCumulativeValues[index] ?? 0,
      date: item.date,
      registrations: item.registrations,
    }))
    .sort(
      (a, b) =>
        b.registrations - a.registrations || b.date.localeCompare(a.date),
    );

  const statementRows = [...registrationsPerProblemStatement]
    .sort(
      (a, b) =>
        b.registeredTeams - a.registeredTeams ||
        b.fillRatePercent - a.fillRatePercent ||
        a.title.localeCompare(b.title),
    )
    .map((item) => ({
      capacity: item.cap,
      fillRatePercent: item.fillRatePercent,
      remainingTeams: item.remainingTeams,
      statement: item.title,
      statementId: item.problemStatementId,
      teams: item.registeredTeams,
    }));

  const submissionsRows = [...pendingByStatementCounts.entries()]
    .map(([statement, pendingCount]) => ({
      pendingTeams: pendingCount,
      statement,
    }))
    .sort(
      (a, b) =>
        b.pendingTeams - a.pendingTeams ||
        a.statement.localeCompare(b.statement),
    );

  const approvalsRows = [...pendingReviewRows]
    .sort(
      (a, b) =>
        b.pendingDaysRaw - a.pendingDaysRaw ||
        String(a.createdAt).localeCompare(String(b.createdAt)),
    )
    .map(({ pendingDaysRaw: _ignored, ...row }) => row);

  const sourceSplitRows = [
    {
      label: "SRMIST",
      value: filteredContexts.filter((context) => context.teamType === "srm")
        .length,
    },
    {
      label: "External",
      value: filteredContexts.filter((context) => context.teamType !== "srm")
        .length,
    },
  ];

  const institutionTopRows = [...institutionCounts.entries()]
    .map(([institution, teams]) => ({ institution, teams }))
    .sort(
      (a, b) => b.teams - a.teams || a.institution.localeCompare(b.institution),
    );

  const institutionTableRows = [
    ...[...collegeCounts.entries()].map(([name, teams]) => ({
      category: "College",
      name,
      teams,
    })),
    ...[...clubCounts.entries()].map(([name, teams]) => ({
      category: "Club",
      name,
      teams,
    })),
  ].sort((a, b) => b.teams - a.teams || a.name.localeCompare(b.name));

  const qualityRows = [...issueCounts.entries()]
    .map(([issue, count]) => ({
      count,
      issue: QUALITY_ISSUE_LABELS[issue] ?? issue,
    }))
    .sort((a, b) => b.count - a.count || a.issue.localeCompare(b.issue));

  const validRows = Math.max(totalTeamsRegistered - rowsWithIssues, 0);
  const anomalyRatePercent =
    totalTeamsRegistered > 0
      ? roundToTwo((rowsWithIssues / totalTeamsRegistered) * 100)
      : 0;

  const registrationPeakDaily = registrationTrendValues.length
    ? Math.max(...registrationTrendValues)
    : 0;
  const averageDailyRegistrations =
    registrationTrendValues.length > 0
      ? roundToTwo(totalTeamsRegistered / registrationTrendValues.length)
      : 0;

  const overviewView: StatsViewPayload = {
    cards: [
      {
        id: "totalTeams",
        label: "Total Teams",
        unit: "teams",
        value: totalTeamsRegistered,
      },
      {
        id: "fillRate",
        label: "Overall Fill Rate",
        unit: "percent",
        value: overallPercent,
      },
      {
        id: "submissionRate",
        label: "Submission Rate",
        unit: "percent",
        value: submissionRatePercent,
      },
      {
        id: "participants",
        label: "Total Participants",
        unit: "participants",
        value: totalParticipants,
      },
    ],
    charts: [
      {
        chartType: "composed",
        id: "overview-registration-trend",
        label: "Registration Trend",
        labels: registrationTrendLabels,
        series: [
          { data: registrationTrendValues, key: "daily", label: "Daily" },
          {
            data: registrationCumulativeValues,
            key: "cumulative",
            label: "Cumulative",
          },
        ],
      },
      {
        chartType: "line",
        id: "overview-submission-trend",
        label: "Submission Trend",
        labels: submissionTrendLabels,
        series: [
          {
            data: submissionTrendValues,
            key: "submissions",
            label: "Submissions",
          },
          {
            data: submissionCumulativeValues,
            key: "cumulative",
            label: "Cumulative",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["statement", "teams", "capacity", "fillRatePercent"],
      limit: query.limit,
      rows: overviewRows,
      sort: "fillRatePercent desc, teams desc",
    }),
  };

  const registrationsView: StatsViewPayload = {
    cards: [
      {
        id: "totalTeams",
        label: "Total Teams",
        unit: "teams",
        value: totalTeamsRegistered,
      },
      {
        id: "avgDaily",
        label: "Average Daily Registrations",
        unit: "teams/day",
        value: averageDailyRegistrations,
      },
      {
        id: "peakDaily",
        label: "Peak Daily Registrations",
        unit: "teams",
        value: registrationPeakDaily,
      },
      {
        id: "avgTeamSize",
        label: "Average Team Size",
        unit: "members",
        value: averageTeamSize,
      },
    ],
    charts: [
      {
        chartType: "composed",
        id: "registrations-daily-cumulative",
        label: "Daily + Cumulative Registrations",
        labels: registrationTrendLabels,
        series: [
          { data: registrationTrendValues, key: "daily", label: "Daily" },
          {
            data: registrationCumulativeValues,
            key: "cumulative",
            label: "Cumulative",
          },
        ],
      },
      {
        chartType: "donut",
        id: "registrations-team-type",
        label: "Team Type Split",
        labels: teamTypeBreakdown.map((item) => item.teamType),
        series: [
          {
            data: teamTypeBreakdown.map((item) => item.teams),
            key: "teams",
            label: "Teams",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["date", "registrations", "cumulative"],
      limit: query.limit,
      rows: registrationRows,
      sort: "registrations desc, date desc",
    }),
  };

  const statementsView: StatsViewPayload = {
    cards: [
      {
        id: "full",
        label: "Full Statements",
        unit: "count",
        value: fullStatements,
      },
      {
        id: "nearCapacity",
        label: "Near Capacity (>=80%)",
        unit: "count",
        value: nearCapacityStatements,
      },
      {
        id: "remainingTeams",
        label: "Remaining Team Capacity",
        unit: "teams",
        value: remainingTeams,
      },
      {
        id: "totalStatements",
        label: "Total Statements",
        unit: "count",
        value: PROBLEM_STATEMENTS.length,
      },
    ],
    charts: [
      {
        chartType: "bar",
        id: "statements-registrations-capacity",
        label: "Registrations vs Capacity",
        labels: labelsByStatement,
        series: [
          {
            data: registrationsPerProblemStatement.map(
              (item) => item.registeredTeams,
            ),
            key: "registrations",
            label: "Registrations",
          },
          {
            data: registrationsPerProblemStatement.map((item) => item.cap),
            key: "capacity",
            label: "Capacity",
          },
        ],
      },
      {
        chartType: "bar",
        id: "statements-fill-rate",
        label: "Fill Rate",
        labels: labelsByStatement,
        series: [
          {
            data: registrationsPerProblemStatement.map(
              (item) => item.fillRatePercent,
            ),
            key: "fillRatePercent",
            label: "Fill Rate %",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: [
        "statement",
        "statementId",
        "teams",
        "capacity",
        "remainingTeams",
        "fillRatePercent",
      ],
      limit: query.limit,
      rows: statementRows,
      sort: "teams desc, fillRatePercent desc",
    }),
  };

  const submissionsView: StatsViewPayload = {
    cards: [
      {
        id: "submittedTeams",
        label: "Submitted Teams",
        unit: "teams",
        value: submittedTeams,
      },
      {
        id: "pendingTeams",
        label: "Pending Teams",
        unit: "teams",
        value: pendingTeams,
      },
      {
        id: "submissionRate",
        label: "Submission Rate",
        unit: "percent",
        value: submissionRatePercent,
      },
      {
        id: "trendDays",
        label: "Submission Trend Days",
        unit: "days",
        value: submissionTrendByDate.length,
      },
    ],
    charts: [
      {
        chartType: "donut",
        id: "submissions-split",
        label: "Submitted vs Pending",
        labels: ["Submitted", "Pending"],
        series: [
          {
            data: [submittedTeams, pendingTeams],
            key: "teams",
            label: "Teams",
          },
        ],
      },
      {
        chartType: "line",
        id: "submissions-trend",
        label: "Daily Submission Trend",
        labels: submissionTrendLabels,
        series: [
          {
            data: submissionTrendValues,
            key: "submissions",
            label: "Submissions",
          },
          {
            data: submissionCumulativeValues,
            key: "cumulative",
            label: "Cumulative",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["statement", "pendingTeams"],
      limit: query.limit,
      rows: submissionsRows,
      sort: "pendingTeams desc",
    }),
  };

  const queueAgeLabels = [
    "0-1 days",
    "2-3 days",
    "4-7 days",
    "8+ days",
    "unknown",
  ];
  const queueAgeValues = queueAgeLabels.map(
    (label) => queueAgeBandCounts[label] ?? 0,
  );

  const approvalsView: StatsViewPayload = {
    cards: [
      {
        id: "notReviewed",
        label: "Pending Review",
        unit: "teams",
        value: notReviewedTeams,
      },
      {
        id: "accepted",
        label: "Accepted",
        unit: "teams",
        value: acceptedTeams,
      },
      {
        id: "rejected",
        label: "Rejected",
        unit: "teams",
        value: rejectedTeams,
      },
      {
        id: "reviewCoverage",
        label: "Review Coverage",
        unit: "percent",
        value: reviewCoveragePercent,
      },
    ],
    charts: [
      {
        chartType: "donut",
        id: "approvals-status",
        label: "Approval Status",
        labels: approvalStatusBreakdown.map((item) => item.status),
        series: [
          {
            data: approvalStatusBreakdown.map((item) => item.teams),
            key: "teams",
            label: "Teams",
          },
        ],
      },
      {
        chartType: "bar",
        id: "approvals-queue-age",
        label: "Review Queue Age Bands",
        labels: queueAgeLabels,
        series: [
          {
            data: queueAgeValues,
            key: "queue",
            label: "Teams",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: [
        "teamName",
        "leadName",
        "teamType",
        "statement",
        "createdAt",
        "pendingDays",
      ],
      limit: query.limit,
      rows: approvalsRows,
      sort: "pendingDays desc, createdAt asc",
    }),
  };

  const institutionsView: StatsViewPayload = {
    cards: [
      {
        id: "srmTeams",
        label: "SRM Teams",
        unit: "teams",
        value: sourceSplitRows[0]?.value ?? 0,
      },
      {
        id: "externalTeams",
        label: "External Teams",
        unit: "teams",
        value: sourceSplitRows[1]?.value ?? 0,
      },
      {
        id: "institutions",
        label: "Unique Institutions",
        unit: "count",
        value: institutionCounts.size,
      },
      {
        id: "clubs",
        label: "Active Clubs",
        unit: "count",
        value: clubCounts.size,
      },
    ],
    charts: [
      {
        chartType: "donut",
        id: "institutions-source-split",
        label: "SRM vs External",
        labels: sourceSplitRows.map((item) => item.label),
        series: [
          {
            data: sourceSplitRows.map((item) => item.value),
            key: "teams",
            label: "Teams",
          },
        ],
      },
      {
        chartType: "bar",
        id: "institutions-top",
        label: "Top Institutions",
        labels: institutionTopRows.map((item) => item.institution),
        series: [
          {
            data: institutionTopRows.map((item) => item.teams),
            key: "teams",
            label: "Teams",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["category", "name", "teams"],
      limit: query.limit,
      rows: institutionTableRows,
      sort: "teams desc",
    }),
  };

  const qualityIssueLabels = qualityRows.map((item) => item.issue);
  const qualityIssueCounts = qualityRows.map((item) => item.count);

  const qualityView: StatsViewPayload = {
    cards: [
      {
        id: "rowsWithIssues",
        label: "Rows With Issues",
        unit: "rows",
        value: rowsWithIssues,
      },
      { id: "validRows", label: "Valid Rows", unit: "rows", value: validRows },
      {
        id: "anomalyRate",
        label: "Anomaly Rate",
        unit: "percent",
        value: anomalyRatePercent,
      },
      {
        id: "issueTypes",
        label: "Issue Types",
        unit: "count",
        value: qualityRows.length,
      },
    ],
    charts: [
      {
        chartType: "bar",
        id: "quality-issue-counts",
        label: "Issue Counts",
        labels: qualityIssueLabels,
        series: [
          {
            data: qualityIssueCounts,
            key: "rows",
            label: "Rows",
          },
        ],
      },
      {
        chartType: "donut",
        id: "quality-valid-vs-issues",
        label: "Valid vs Issues",
        labels: ["Valid", "Issue Rows"],
        series: [
          {
            data: [validRows, rowsWithIssues],
            key: "rows",
            label: "Rows",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["issue", "count"],
      limit: query.limit,
      rows: qualityRows,
      sort: "count desc",
    }),
  };

  const baseViewPayloadByDataset: Record<
    Exclude<StatsExportDataset, "exports">,
    StatsViewPayload
  > = {
    approvals: approvalsView,
    institutions: institutionsView,
    overview: overviewView,
    quality: qualityView,
    registrations: registrationsView,
    statements: statementsView,
    submissions: submissionsView,
  };

  const exportRowsWithoutExports = STATS_EXPORT_DATASETS.filter(
    (dataset) => dataset !== "exports",
  ).map((datasetId) => {
    const viewPayload = baseViewPayloadByDataset[datasetId];
    return {
      availableRows: viewPayload.table.total,
      dataset: datasetId,
      description: EXPORT_DATASET_DESCRIPTIONS[datasetId],
      view: STATS_DATASET_VIEW_MAP[datasetId],
    };
  });

  const exportsDatasetRow = {
    availableRows: exportRowsWithoutExports.length + 1,
    dataset: "exports",
    description: EXPORT_DATASET_DESCRIPTIONS.exports,
    view: STATS_DATASET_VIEW_MAP.exports,
  };

  const exportRows = [...exportRowsWithoutExports, exportsDatasetRow];

  const exportsView: StatsViewPayload = {
    cards: [
      {
        id: "datasets",
        label: "Export Datasets",
        unit: "count",
        value: exportRows.length,
      },
      {
        id: "rowsAfterFilters",
        label: "Rows After Filters",
        unit: "rows",
        value: totalRowsAfterFilters,
      },
      {
        id: "rowLimit",
        label: "Row Limit",
        unit: "rows",
        value: query.limit,
      },
      {
        id: "timezone",
        label: "Trend Timezone",
        unit: "tz",
        value: REGISTRATION_TREND_TIMEZONE,
      },
    ],
    charts: [
      {
        chartType: "bar",
        id: "exports-dataset-rows",
        label: "Rows By Dataset",
        labels: exportRows.map((row) => row.dataset),
        series: [
          {
            data: exportRows.map((row) => row.availableRows),
            key: "rows",
            label: "Rows",
          },
        ],
      },
    ],
    table: toViewTable({
      columns: ["dataset", "description", "availableRows", "view"],
      limit: query.limit,
      rows: exportRows,
      sort: "availableRows desc",
    }),
  };

  const views: StatsViewsPayload = {
    approvals: approvalsView,
    exports: exportsView,
    institutions: institutionsView,
    overview: overviewView,
    quality: qualityView,
    registrations: registrationsView,
    statements: statementsView,
    submissions: submissionsView,
  };

  const generatedAt = new Date().toISOString();

  const response: RegistrationStatsResponse = {
    additionalStats: {
      anomalies: {
        missingOrInvalidTeamMembers,
        missingOrInvalidTeamType,
        missingProblemStatementId,
        unknownProblemStatementId,
      },
      approvalStatusBreakdown,
      firstRegistrationAt:
        earliestRegistrationTimestamp === null
          ? null
          : new Date(earliestRegistrationTimestamp).toISOString(),
      lastRegistrationAt:
        latestRegistrationTimestamp === null
          ? null
          : new Date(latestRegistrationTimestamp).toISOString(),
      participation: {
        averageTeamSize,
        totalParticipants,
      },
      presentationSubmission: {
        pendingTeams,
        submissionRatePercent,
        submittedTeams,
      },
      registrationTrendTimezone: REGISTRATION_TREND_TIMEZONE,
      registrationTrendByDate,
      teamTypeBreakdown,
    },
    event: {
      eventId: EVENT_ID,
      eventTitle: EVENT_TITLE,
      statementCap: PROBLEM_STATEMENT_CAP,
      totalCapacity: capacityTeams,
      totalStatements: PROBLEM_STATEMENTS.length,
    },
    filters: {
      excludedRegistrationEmails: excludedEmails,
      excludedRows,
      includedRows: totalRowsAfterFilters,
    },
    generatedAt,
    meta: {
      activeView: query.view,
      appliedFilters: {
        approval: query.approval,
        from: query.from,
        limit: query.limit,
        statement: query.statement,
        teamType: query.teamType,
        to: query.to,
      },
      generatedAt,
      registrationTrendTimezone: REGISTRATION_TREND_TIMEZONE,
      statementOptions: PROBLEM_STATEMENTS.map((statement) => ({
        id: statement.id,
        title: statement.title,
      })),
      totalRowsAfterFilters,
      totalRowsBeforeFilters,
    },
    requiredStats: {
      rateOfFilling: {
        capacityTeams,
        filledTeams,
        overallPercent,
        remainingTeams,
      },
      registrationsPerProblemStatement,
      totalTeamsRegistered,
    },
    views,
    visualData: {
      cards: [
        {
          id: "totalTeamsRegistered",
          label: "Total Teams Registered",
          unit: "teams",
          value: totalTeamsRegistered,
        },
        {
          id: "overallFillRate",
          label: "Overall Fill Rate",
          unit: "percent",
          value: overallPercent,
        },
        {
          id: "totalParticipants",
          label: "Total Participants",
          unit: "participants",
          value: totalParticipants,
        },
        {
          id: "avgTeamSize",
          label: "Average Team Size",
          unit: "members_per_team",
          value: averageTeamSize,
        },
        {
          id: "pptSubmissionRate",
          label: "PPT Submission Rate",
          unit: "percent",
          value: submissionRatePercent,
        },
      ],
      charts: {
        approvalStatusDistribution: {
          chartType: "donut",
          labels: approvalStatusBreakdown.map((item) => item.status),
          series: [
            {
              data: approvalStatusBreakdown.map((item) => item.teams),
              name: "Teams",
            },
          ],
        },
        fillRatePerProblemStatement: {
          chartType: "bar",
          labels: labelsByStatement,
          series: [
            {
              data: registrationsPerProblemStatement.map(
                (item) => item.fillRatePercent,
              ),
              name: "Fill Rate %",
            },
          ],
        },
        registrationTrendByDate: {
          chartType: "line",
          labels: registrationTrendByDate.map((item) => item.date),
          series: [
            {
              data: registrationTrendByDate.map((item) => item.registrations),
              name: "Registrations",
            },
          ],
        },
        registrationsPerProblemStatement: {
          chartType: "bar",
          labels: labelsByStatement,
          series: [
            {
              data: registrationsPerProblemStatement.map(
                (item) => item.registeredTeams,
              ),
              name: "Registrations",
            },
            {
              data: registrationsPerProblemStatement.map((item) => item.cap),
              name: "Capacity",
            },
          ],
        },
        teamTypeDistribution: {
          chartType: "donut",
          labels: teamTypeBreakdown.map((item) => item.teamType),
          series: [
            {
              data: teamTypeBreakdown.map((item) => item.teams),
              name: "Teams",
            },
          ],
        },
      },
    },
  };

  return ok(response);
};

export type { RegistrationStatsResponse };
