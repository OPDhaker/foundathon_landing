import {
  STATS_APPROVAL_FILTERS,
  STATS_LIMIT_DEFAULT,
  STATS_LIMIT_MAX,
  STATS_TEAM_TYPE_FILTERS,
  type StatsApprovalFilter,
  type StatsTeamTypeFilter,
} from "@/app/stats/stats-filters";
import { isStatsView, type StatsView } from "@/app/stats/stats-views";
import type { StatsV2QueryInput } from "@/app/stats-v2/stats-v2-filters";
import {
  getStatsV2ExportDatasetConfig,
  isStatsV2Section,
  mapLegacyStatsViewToSection,
  STATS_V2_DEFAULT_SECTION,
  STATS_V2_EXPORT_DATASETS,
  type StatsV2ExportDataset,
  type StatsV2Section,
} from "@/app/stats-v2/stats-v2-sections";
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

export type ServiceFailureV2 = {
  error: string;
  ok: false;
  status: number;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailureV2;

const ok = <T>(data: T, status = 200): ServiceSuccess<T> => ({
  data,
  ok: true,
  status,
});

const fail = (error: string, status: number): ServiceFailureV2 => ({
  error,
  ok: false,
  status,
});

type TeamType = "non_srm" | "srm" | "unknown";

type ApprovalStatus =
  | "accepted"
  | "invalid"
  | "not_reviewed"
  | "rejected"
  | "submitted";

type QueueAgeBand =
  | "0-1 days"
  | "2-3 days"
  | "4-7 days"
  | "8+ days"
  | "unknown";

type ChartLabelMode = "default" | "date" | "hour_bucket" | "hour_of_day";

type StatsV2Card = {
  id: string;
  label: string;
  unit: string;
  value: number | string;
};

type StatsV2Chart = {
  chartType: "bar" | "composed" | "donut" | "line";
  id: string;
  label: string;
  labels: string[];
  series: Array<{
    data: number[];
    key: string;
    label: string;
  }>;
  tooltipLabelMode?: ChartLabelMode;
  xAxisLabelMode?: ChartLabelMode;
};

type StatsV2TableCell = number | string | null;
export type StatsV2TableRow = Record<string, StatsV2TableCell>;

export type RegistrationStatsV2Table = {
  columns: string[];
  limit: number;
  rows: StatsV2TableRow[];
  sort: string;
  total: number;
};

export type RegistrationStatsV2SectionPayload = {
  cards: StatsV2Card[];
  charts: StatsV2Chart[];
  table: RegistrationStatsV2Table;
};

type RegistrationStatsV2SummaryMetric = {
  id: string;
  label: string;
  unit: string;
  value: number | string;
};

type RegistrationStatsV2AppliedFilters = {
  approval: StatsApprovalFilter;
  from: string | null;
  limit: number;
  statement: string;
  teamType: StatsTeamTypeFilter;
  to: string | null;
};

type RegistrationStatsV2Meta = {
  activeSection: StatsV2Section;
  appliedFilters: RegistrationStatsV2AppliedFilters;
  generatedAt: string;
  registrationTrendTimezone: "Asia/Kolkata";
  statementOptions: Array<{
    id: string;
    title: string;
  }>;
  totalRowsAfterFilters: number;
  totalRowsBeforeFilters: number;
};

type RegistrationStatsV2ExportDatasetInfo = {
  description: string;
  id: StatsV2ExportDataset;
  label: string;
  rowCount: number;
  section: StatsV2Section;
};

export type RegistrationStatsV2Response = {
  event: {
    eventId: string;
    eventTitle: string;
    statementCap: number;
    totalCapacity: number;
    totalStatements: number;
  };
  exports: {
    datasets: RegistrationStatsV2ExportDatasetInfo[];
  };
  filters: {
    excludedRegistrationEmails: string[];
    excludedRows: number;
    includedRows: number;
  };
  generatedAt: string;
  meta: RegistrationStatsV2Meta;
  sections: {
    intake: RegistrationStatsV2SectionPayload;
    quality: RegistrationStatsV2SectionPayload;
    review: RegistrationStatsV2SectionPayload;
  };
  summary: RegistrationStatsV2SummaryMetric[];
};

type StatsRegistrationRow = RegistrationRow & {
  is_approved?: string | null;
  registration_email?: string | null;
};

type RowContext = {
  approvalStatus: ApprovalStatus;
  createdAt: string;
  createdAtIstDate: string | null;
  createdAtIstHour: string | null;
  createdAtIstHourOfDay: string | null;
  createdTimestamp: number | null;
  hasInvalidTeamMembers: boolean;
  hasPresentation: boolean;
  issues: string[];
  leadName: string;
  statementId: string | null;
  statementTitle: string;
  teamName: string;
  teamType: TeamType;
};

type SubmissionStatus = "pending" | "submitted";

type IntakeActionRow = {
  approvalStatus: ApprovalStatus;
  createdAt: string;
  leadName: string;
  statement: string;
  submissionStatus: SubmissionStatus;
  teamName: string;
  teamType: TeamType;
};

type IntakeActionRowSource = IntakeActionRow & {
  createdTimestamp: number | null;
};

type ReviewActionRow = {
  createdAt: string;
  leadName: string;
  pendingDays: number | "Unknown";
  statement: string;
  submissionStatus: SubmissionStatus;
  teamName: string;
  teamType: TeamType;
};

type ReviewActionRowSource = ReviewActionRow & {
  createdTimestamp: number | null;
  pendingDaysRaw: number;
  pendingDaysValue: number | null;
};

type QualityActionRow = {
  approvalStatus: ApprovalStatus;
  createdAt: string;
  issues: string;
  leadName: string;
  statement: string;
  teamName: string;
  teamType: TeamType;
};

type QualityActionRowSource = QualityActionRow & {
  createdTimestamp: number | null;
  issuesCount: number;
  issuesSeverity: number;
};

type ComputedStatsV2 = {
  exportTables: Record<StatsV2ExportDataset, RegistrationStatsV2Table>;
  response: RegistrationStatsV2Response;
};

type StatsV2QueryInputInternal = {
  approval: StatsApprovalFilter;
  from: string | null;
  legacyView: StatsView | null;
  limit: number;
  section: StatsV2Section;
  statement: string;
  teamType: StatsTeamTypeFilter;
  to: string | null;
};

const REGISTRATION_TREND_TIMEZONE = "Asia/Kolkata";

const QUALITY_ISSUE_LABELS: Record<string, string> = {
  incomplete_presentation_metadata: "Incomplete presentation metadata",
  missing_lead_data: "Missing lead metadata",
  missing_or_invalid_team_members: "Missing or invalid team members",
  missing_or_invalid_team_type: "Missing or invalid team type",
  missing_problem_statement_id: "Missing problem statement id",
  unknown_problem_statement_id: "Unknown problem statement id",
};

const DEFAULT_STATS_V2_QUERY_INPUT: StatsV2QueryInputInternal = {
  approval: "all",
  from: null,
  legacyView: null,
  limit: STATS_LIMIT_DEFAULT,
  section: STATS_V2_DEFAULT_SECTION,
  statement: "all",
  teamType: "all",
  to: null,
};

const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: REGISTRATION_TREND_TIMEZONE,
  year: "numeric",
});

const IST_HOUR_BUCKET_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  month: "2-digit",
  timeZone: REGISTRATION_TREND_TIMEZONE,
  year: "numeric",
});

const IST_HOUR_OF_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: REGISTRATION_TREND_TIMEZONE,
});

const IST_HOUR_CARD_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
  month: "short",
  timeZone: REGISTRATION_TREND_TIMEZONE,
});

const HOUR_OF_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  hour12: true,
  timeZone: REGISTRATION_TREND_TIMEZONE,
});

const HOUR_OF_DAY_BUCKETS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const getIstHourBucketString = (input: string) => {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  const parts = IST_HOUR_BUCKET_FORMATTER.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;

  if (!year || !month || !day || !hour) {
    return null;
  }

  return `${year}-${month}-${day} ${hour}:00`;
};

const getIstHourOfDayString = (input: string) => {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  const parts = IST_HOUR_OF_DAY_FORMATTER.formatToParts(parsed);
  const hour = parts.find((part) => part.type === "hour")?.value;
  return hour ?? null;
};

const formatHourBucketForDisplay = (bucket: string | null) => {
  if (!bucket) {
    return "N/A";
  }

  const [datePart, timePart] = bucket.split(" ");
  const hour = timePart?.slice(0, 2);
  if (!datePart || !hour) {
    return bucket;
  }

  const parsed = new Date(`${datePart}T${hour}:00:00+05:30`);
  if (Number.isNaN(parsed.valueOf())) {
    return bucket;
  }

  return IST_HOUR_CARD_FORMATTER.format(parsed);
};

const formatHourOfDayLabel = (hour: string | null) => {
  if (!hour || !/^\d{2}$/.test(hour)) {
    return "N/A";
  }

  const parsed = new Date(`1970-01-01T${hour}:00:00+05:30`);
  if (Number.isNaN(parsed.valueOf())) {
    return hour;
  }

  return HOUR_OF_DAY_LABEL_FORMATTER.format(parsed);
};

const toCumulativeSeries = (values: number[]) => {
  let running = 0;
  return values.map((value) => {
    running += value;
    return running;
  });
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

const getQueueAgeBand = (pendingDays: number | null): QueueAgeBand => {
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

const normalizeIsoDate = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const normalizeStatsV2QueryInput = (
  input?: Partial<StatsV2QueryInput>,
): StatsV2QueryInputInternal => {
  const approvalCandidate = (input?.approval ?? "all") as StatsApprovalFilter;
  const approval = STATS_APPROVAL_FILTERS.includes(approvalCandidate)
    ? approvalCandidate
    : DEFAULT_STATS_V2_QUERY_INPUT.approval;

  const teamTypeCandidate = (input?.teamType ?? "all") as StatsTeamTypeFilter;
  const teamType = STATS_TEAM_TYPE_FILTERS.includes(teamTypeCandidate)
    ? teamTypeCandidate
    : DEFAULT_STATS_V2_QUERY_INPUT.teamType;

  const statement =
    typeof input?.statement === "string" && input.statement.trim().length > 0
      ? input.statement.trim()
      : DEFAULT_STATS_V2_QUERY_INPUT.statement;

  const from = normalizeIsoDate(input?.from) ?? null;
  const to = normalizeIsoDate(input?.to) ?? null;

  const limitCandidate = Number.parseInt(String(input?.limit ?? ""), 10);
  const limit =
    Number.isFinite(limitCandidate) && limitCandidate > 0
      ? Math.min(limitCandidate, STATS_LIMIT_MAX)
      : STATS_LIMIT_DEFAULT;

  const legacyView = isStatsView(input?.legacyView) ? input.legacyView : null;
  const sectionFromLegacyView = mapLegacyStatsViewToSection(legacyView);
  const section = isStatsV2Section(input?.section)
    ? input.section
    : (sectionFromLegacyView ?? STATS_V2_DEFAULT_SECTION);

  if (from && to && from > to) {
    return {
      approval,
      from: to,
      legacyView,
      limit,
      section,
      statement,
      teamType,
      to: from,
    };
  }

  return {
    approval,
    from,
    legacyView,
    limit,
    section,
    statement,
    teamType,
    to,
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
  const createdAtIstHour = getIstHourBucketString(row.created_at);
  const createdAtIstHourOfDay = getIstHourOfDayString(row.created_at);

  const knownStatementTitle =
    statementId && statementIdSet.has(statementId)
      ? (statementTitleById.get(statementId) ?? null)
      : null;
  const statementTitle =
    knownStatementTitle ??
    toOptionalString(details.problemStatementTitle) ??
    (statementId ? `Unknown (${statementId})` : "Unassigned");

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
    createdAt: row.created_at,
    createdAtIstDate,
    createdAtIstHour,
    createdAtIstHourOfDay,
    createdTimestamp: Number.isNaN(createdTimestamp) ? null : createdTimestamp,
    hasInvalidTeamMembers: participantsResult.hasInvalidTeamMembers,
    hasPresentation,
    issues,
    leadName,
    statementId,
    statementTitle,
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
  rows: StatsV2TableRow[];
  sort: string;
}): RegistrationStatsV2Table => ({
  columns,
  limit,
  rows: rows.slice(0, limit),
  sort,
  total: rows.length,
});

const toIssueLabel = (issueKey: string) =>
  QUALITY_ISSUE_LABELS[issueKey] ?? issueKey;

const compareCreatedTimestampDesc = (
  left: { createdAt: string; createdTimestamp: number | null },
  right: { createdAt: string; createdTimestamp: number | null },
) => {
  const leftTimestamp = left.createdTimestamp ?? Number.NEGATIVE_INFINITY;
  const rightTimestamp = right.createdTimestamp ?? Number.NEGATIVE_INFINITY;

  return (
    rightTimestamp - leftTimestamp ||
    right.createdAt.localeCompare(left.createdAt)
  );
};

const compareCreatedTimestampAsc = (
  left: { createdAt: string; createdTimestamp: number | null },
  right: { createdAt: string; createdTimestamp: number | null },
) => {
  const leftTimestamp = left.createdTimestamp ?? Number.POSITIVE_INFINITY;
  const rightTimestamp = right.createdTimestamp ?? Number.POSITIVE_INFINITY;

  return (
    leftTimestamp - rightTimestamp ||
    left.createdAt.localeCompare(right.createdAt)
  );
};

const buildComputedStats = ({
  excludedEmails,
  excludedRows,
  filteredContexts,
  query,
  totalRowsBeforeFilters,
}: {
  excludedEmails: string[];
  excludedRows: number;
  filteredContexts: RowContext[];
  query: StatsV2QueryInputInternal;
  totalRowsBeforeFilters: number;
}): ComputedStatsV2 => {
  const totalRowsAfterFilters = filteredContexts.length;

  const statementIdSet = new Set(PROBLEM_STATEMENTS.map((item) => item.id));
  const statementCounts = new Map<string, number>();
  const registrationTrendCounts = new Map<string, number>();
  const registrationTrendHourlyCounts = new Map<string, number>();
  const registrationByHourOfDayCounts = new Map<string, number>();
  const issueCounts = new Map<string, number>();

  const queueAgeLabels: QueueAgeBand[] = [
    "0-1 days",
    "2-3 days",
    "4-7 days",
    "8+ days",
    "unknown",
  ];
  const queueAgeBandCounts: Record<QueueAgeBand, number> = {
    "0-1 days": 0,
    "2-3 days": 0,
    "4-7 days": 0,
    "8+ days": 0,
    unknown: 0,
  };

  let missingProblemStatementId = 0;
  let missingOrInvalidTeamMembers = 0;
  let rowsWithIssues = 0;
  let pendingReviewTeams = 0;
  let submittedButNotReviewed = 0;
  let pendingSubmissions = 0;
  let oldestPendingDaysNumber: number | null = null;
  let hasUnknownPendingAge = false;

  const intakeRowsSource: IntakeActionRowSource[] = [];
  const reviewRowsSource: ReviewActionRowSource[] = [];
  const qualityRowsSource: QualityActionRowSource[] = [];
  const pendingSubmissionRowsSource: IntakeActionRowSource[] = [];

  for (const context of filteredContexts) {
    if (!context.statementId) {
      missingProblemStatementId += 1;
    } else if (!statementIdSet.has(context.statementId)) {
      // Unknown statement ids are tracked in issueCounts via row issues.
    } else {
      statementCounts.set(
        context.statementId,
        (statementCounts.get(context.statementId) ?? 0) + 1,
      );
    }

    if (context.hasInvalidTeamMembers) {
      missingOrInvalidTeamMembers += 1;
    }

    if (!context.hasPresentation) {
      pendingSubmissions += 1;
    }

    if (context.createdAtIstDate) {
      registrationTrendCounts.set(
        context.createdAtIstDate,
        (registrationTrendCounts.get(context.createdAtIstDate) ?? 0) + 1,
      );
    }
    if (context.createdAtIstHour) {
      registrationTrendHourlyCounts.set(
        context.createdAtIstHour,
        (registrationTrendHourlyCounts.get(context.createdAtIstHour) ?? 0) + 1,
      );
    }
    if (context.createdAtIstHourOfDay) {
      registrationByHourOfDayCounts.set(
        context.createdAtIstHourOfDay,
        (registrationByHourOfDayCounts.get(context.createdAtIstHourOfDay) ??
          0) + 1,
      );
    }

    const submissionStatus = context.hasPresentation ? "submitted" : "pending";

    intakeRowsSource.push({
      approvalStatus: context.approvalStatus,
      createdAt: context.createdAt,
      createdTimestamp: context.createdTimestamp,
      leadName: context.leadName,
      statement: context.statementTitle,
      submissionStatus,
      teamName: context.teamName,
      teamType: context.teamType,
    });

    if (!context.hasPresentation) {
      pendingSubmissionRowsSource.push({
        approvalStatus: context.approvalStatus,
        createdAt: context.createdAt,
        createdTimestamp: context.createdTimestamp,
        leadName: context.leadName,
        statement: context.statementTitle,
        submissionStatus,
        teamName: context.teamName,
        teamType: context.teamType,
      });
    }

    if (context.approvalStatus === "not_reviewed") {
      pendingReviewTeams += 1;
      if (context.hasPresentation) {
        submittedButNotReviewed += 1;
      }

      const pendingDays = getPendingAgeDays(context.createdTimestamp);
      if (pendingDays === null) {
        hasUnknownPendingAge = true;
      } else if (
        oldestPendingDaysNumber === null ||
        pendingDays > oldestPendingDaysNumber
      ) {
        oldestPendingDaysNumber = pendingDays;
      }

      const queueAgeBand = getQueueAgeBand(pendingDays);
      queueAgeBandCounts[queueAgeBand] += 1;

      reviewRowsSource.push({
        createdAt: context.createdAt,
        createdTimestamp: context.createdTimestamp,
        leadName: context.leadName,
        pendingDays: pendingDays ?? "Unknown",
        pendingDaysRaw: pendingDays ?? Number.MAX_SAFE_INTEGER,
        pendingDaysValue: pendingDays,
        statement: context.statementTitle,
        submissionStatus,
        teamName: context.teamName,
        teamType: context.teamType,
      });
    }

    if (context.issues.length > 0) {
      rowsWithIssues += 1;
      for (const issue of context.issues) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }

      qualityRowsSource.push({
        approvalStatus: context.approvalStatus,
        createdAt: context.createdAt,
        createdTimestamp: context.createdTimestamp,
        issues: context.issues.map(toIssueLabel).join(" | "),
        issuesCount: context.issues.length,
        issuesSeverity: context.issues.length,
        leadName: context.leadName,
        statement: context.statementTitle,
        teamName: context.teamName,
        teamType: context.teamType,
      });
    }
  }

  const statementStats = PROBLEM_STATEMENTS.map((statement) => {
    const registeredTeams = statementCounts.get(statement.id) ?? 0;
    const fillRatePercent = roundToTwo(
      (registeredTeams / PROBLEM_STATEMENT_CAP) * 100,
    );

    return {
      fillRatePercent,
      registeredTeams,
      statementId: statement.id,
      title: statement.title,
    };
  });

  const nearCapacityStatements = statementStats.filter(
    (item) =>
      item.registeredTeams < PROBLEM_STATEMENT_CAP &&
      item.fillRatePercent >= 80,
  ).length;

  const capacityTeams = PROBLEM_STATEMENT_CAP * PROBLEM_STATEMENTS.length;
  const filledTeams = statementStats.reduce(
    (total, item) => total + item.registeredTeams,
    0,
  );
  const overallFillRatePercent = roundToTwo(
    (filledTeams / capacityTeams) * 100,
  );

  const registrationTrendByDate = [...registrationTrendCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, registrations]) => ({ date, registrations }));

  const registrationTrendByHour = [...registrationTrendHourlyCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hour, registrations]) => ({ hour, registrations }));

  const registrationByHourOfDay = HOUR_OF_DAY_BUCKETS.map((hour) => {
    const registrations = registrationByHourOfDayCounts.get(hour) ?? 0;
    return {
      hour,
      registrations,
      sharePercent:
        totalRowsAfterFilters > 0
          ? roundToTwo((registrations / totalRowsAfterFilters) * 100)
          : 0,
    };
  });

  const peakHourBucketEntry = registrationTrendByHour.reduce<{
    hour: string;
    registrations: number;
  } | null>((peak, entry) => {
    if (!peak || entry.registrations > peak.registrations) {
      return entry;
    }
    return peak;
  }, null);

  const peakHourBucket = peakHourBucketEntry?.hour ?? null;
  const peakHourCount = peakHourBucketEntry?.registrations ?? 0;

  const busiestHourOfDayEntry = registrationByHourOfDay.reduce<{
    hour: string;
    registrations: number;
    sharePercent: number;
  } | null>((peak, entry) => {
    if (!peak || entry.registrations > peak.registrations) {
      return entry;
    }
    return peak;
  }, null);

  const busiestHourOfDay =
    totalRowsAfterFilters > 0 ? (busiestHourOfDayEntry?.hour ?? null) : null;
  const busiestHourCount = busiestHourOfDayEntry?.registrations ?? 0;
  const busiestHourSharePercent = busiestHourOfDayEntry?.sharePercent ?? 0;

  const registrationTrendLabels = registrationTrendByDate.map(
    (item) => item.date,
  );
  const registrationTrendValues = registrationTrendByDate.map(
    (item) => item.registrations,
  );
  const registrationTrendHourlyLabels = registrationTrendByHour.map(
    (item) => item.hour,
  );
  const registrationTrendHourlyValues = registrationTrendByHour.map(
    (item) => item.registrations,
  );
  const registrationByHourOfDayLabels = registrationByHourOfDay.map(
    (item) => item.hour,
  );
  const registrationByHourOfDayValues = registrationByHourOfDay.map(
    (item) => item.registrations,
  );
  const registrationCumulativeValues = toCumulativeSeries(
    registrationTrendValues,
  );

  const averageDailyRegistrations =
    registrationTrendValues.length > 0
      ? roundToTwo(totalRowsAfterFilters / registrationTrendValues.length)
      : 0;
  const registrationPeakHourly = peakHourCount;
  const peakHourWindowDisplay = formatHourBucketForDisplay(peakHourBucket);
  const busiestHourOfDayDisplay =
    busiestHourOfDay === null
      ? "N/A"
      : `${formatHourOfDayLabel(busiestHourOfDay)} (${busiestHourCount} regs, ${busiestHourSharePercent}%)`;

  const reviewedTeams = totalRowsAfterFilters - pendingReviewTeams;
  const reviewCoveragePercent =
    totalRowsAfterFilters > 0
      ? roundToTwo((reviewedTeams / totalRowsAfterFilters) * 100)
      : 0;

  const anomalyRatePercent =
    totalRowsAfterFilters > 0
      ? roundToTwo((rowsWithIssues / totalRowsAfterFilters) * 100)
      : 0;

  const oldestPendingDays: number | string =
    oldestPendingDaysNumber !== null
      ? oldestPendingDaysNumber
      : pendingReviewTeams > 0 && hasUnknownPendingAge
        ? "Unknown"
        : "N/A";

  const intakeRows = [...intakeRowsSource]
    .sort((left, right) => compareCreatedTimestampDesc(left, right))
    .map(({ createdTimestamp: _ignored, ...row }) => row);

  const reviewRowsWithRaw = [...reviewRowsSource].sort(
    (left, right) =>
      right.pendingDaysRaw - left.pendingDaysRaw ||
      compareCreatedTimestampAsc(left, right),
  );
  const reviewRows = reviewRowsWithRaw.map(
    ({
      createdTimestamp: _ignored,
      pendingDaysRaw: _pendingDaysRaw,
      pendingDaysValue: _pendingDaysValue,
      ...row
    }) => row,
  );

  const qualityRowsWithRaw = [...qualityRowsSource].sort(
    (left, right) =>
      right.issuesSeverity - left.issuesSeverity ||
      compareCreatedTimestampAsc(left, right),
  );
  const qualityRows = qualityRowsWithRaw.map(
    ({
      createdTimestamp: _ignored,
      issuesCount: _issuesCount,
      issuesSeverity: _issuesSeverity,
      ...row
    }) => row,
  );

  const pendingSubmissionRows = [...pendingSubmissionRowsSource]
    .sort((left, right) => compareCreatedTimestampAsc(left, right))
    .map(({ createdTimestamp: _ignored, ...row }) => row);

  const blockersReviewOverdueRows = reviewRowsWithRaw
    .filter((row) => row.pendingDaysValue === null || row.pendingDaysValue >= 4)
    .map(
      ({
        createdTimestamp: _ignored,
        pendingDaysRaw: _pendingDaysRaw,
        pendingDaysValue: _pendingDaysValue,
        ...row
      }) => row,
    );

  const blockersDataQualityRows = qualityRows;

  const qualityIssueRows = [...issueCounts.entries()]
    .map(([issue, count]) => ({ count, issue: toIssueLabel(issue) }))
    .sort(
      (left, right) =>
        right.count - left.count || left.issue.localeCompare(right.issue),
    );

  const queueAgeValues = queueAgeLabels.map(
    (label) => queueAgeBandCounts[label],
  );

  const intakeTable = toViewTable({
    columns: [
      "teamName",
      "leadName",
      "teamType",
      "statement",
      "createdAt",
      "approvalStatus",
      "submissionStatus",
    ],
    limit: query.limit,
    rows: intakeRows,
    sort: "createdAt desc",
  });

  const reviewTable = toViewTable({
    columns: [
      "teamName",
      "leadName",
      "teamType",
      "statement",
      "createdAt",
      "pendingDays",
      "submissionStatus",
    ],
    limit: query.limit,
    rows: reviewRows,
    sort: "pendingDays desc, createdAt asc",
  });

  const qualityTable = toViewTable({
    columns: [
      "teamName",
      "leadName",
      "teamType",
      "statement",
      "issues",
      "createdAt",
      "approvalStatus",
    ],
    limit: query.limit,
    rows: qualityRows,
    sort: "issuesSeverity desc, createdAt asc",
  });

  const exportTables: Record<StatsV2ExportDataset, RegistrationStatsV2Table> = {
    blockers_data_quality: toViewTable({
      columns: qualityTable.columns,
      limit: query.limit,
      rows: blockersDataQualityRows,
      sort: "issuesSeverity desc, createdAt asc",
    }),
    blockers_pending_submission: toViewTable({
      columns: intakeTable.columns,
      limit: query.limit,
      rows: pendingSubmissionRows,
      sort: "createdAt asc",
    }),
    blockers_review_overdue: toViewTable({
      columns: reviewTable.columns,
      limit: query.limit,
      rows: blockersReviewOverdueRows,
      sort: "pendingDays desc, createdAt asc",
    }),
    intake_workstream: intakeTable,
    quality_workstream: qualityTable,
    review_workstream: reviewTable,
  };

  const exportDatasets = STATS_V2_EXPORT_DATASETS.map((datasetId) => {
    const config = getStatsV2ExportDatasetConfig(datasetId);
    const datasetTable = exportTables[datasetId];

    return {
      description: config.description,
      id: datasetId,
      label: config.label,
      rowCount: datasetTable.total,
      section: config.section,
    };
  });

  const generatedAt = new Date().toISOString();

  const response: RegistrationStatsV2Response = {
    event: {
      eventId: EVENT_ID,
      eventTitle: EVENT_TITLE,
      statementCap: PROBLEM_STATEMENT_CAP,
      totalCapacity: capacityTeams,
      totalStatements: PROBLEM_STATEMENTS.length,
    },
    exports: {
      datasets: exportDatasets,
    },
    filters: {
      excludedRegistrationEmails: excludedEmails,
      excludedRows,
      includedRows: totalRowsAfterFilters,
    },
    generatedAt,
    meta: {
      activeSection: query.section,
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
    sections: {
      intake: {
        cards: [
          {
            id: "totalTeams",
            label: "Total Teams",
            unit: "teams",
            value: totalRowsAfterFilters,
          },
          {
            id: "overallFillRate",
            label: "Overall Fill Rate",
            unit: "percent",
            value: overallFillRatePercent,
          },
          {
            id: "averageDailyRegistrations",
            label: "Average Daily Registrations",
            unit: "teams/day",
            value: averageDailyRegistrations,
          },
          {
            id: "nearCapacityStatements",
            label: "Near Capacity Statements (>=80%)",
            unit: "count",
            value: nearCapacityStatements,
          },
          {
            id: "peakHourlyRegistrations",
            label: "Peak Hourly Registrations",
            unit: "teams",
            value: registrationPeakHourly,
          },
          {
            id: "peakHourWindow",
            label: "Peak Hour Window (IST)",
            unit: "window",
            value: peakHourWindowDisplay,
          },
          {
            id: "busiestHourOfDay",
            label: "Busiest Hour Of Day",
            unit: "hour",
            value: busiestHourOfDayDisplay,
          },
        ],
        charts: [
          {
            chartType: "composed",
            id: "intake-daily-cumulative-registrations",
            label: "Daily + Cumulative Registrations",
            labels: registrationTrendLabels,
            tooltipLabelMode: "date",
            xAxisLabelMode: "date",
            series: [
              {
                data: registrationTrendValues,
                key: "daily",
                label: "Daily",
              },
              {
                data: registrationCumulativeValues,
                key: "cumulative",
                label: "Cumulative",
              },
            ],
          },
          {
            chartType: "line",
            id: "intake-hourly-registrations",
            label: "Hourly Registrations (IST)",
            labels: registrationTrendHourlyLabels,
            tooltipLabelMode: "hour_bucket",
            xAxisLabelMode: "hour_bucket",
            series: [
              {
                data: registrationTrendHourlyValues,
                key: "hourly",
                label: "Hourly",
              },
            ],
          },
          {
            chartType: "bar",
            id: "intake-hour-of-day-distribution",
            label: "Registrations by Hour of Day (IST)",
            labels: registrationByHourOfDayLabels,
            tooltipLabelMode: "hour_of_day",
            xAxisLabelMode: "hour_of_day",
            series: [
              {
                data: registrationByHourOfDayValues,
                key: "hourlyDistribution",
                label: "Registrations",
              },
            ],
          },
        ],
        table: intakeTable,
      },
      quality: {
        cards: [
          {
            id: "rowsWithIssues",
            label: "Rows With Issues",
            unit: "rows",
            value: rowsWithIssues,
          },
          {
            id: "anomalyRate",
            label: "Anomaly Rate",
            unit: "percent",
            value: anomalyRatePercent,
          },
          {
            id: "missingStatementId",
            label: "Missing Statement ID",
            unit: "rows",
            value: missingProblemStatementId,
          },
          {
            id: "invalidTeamMembers",
            label: "Invalid Team Members",
            unit: "rows",
            value: missingOrInvalidTeamMembers,
          },
        ],
        charts: [
          {
            chartType: "bar",
            id: "quality-issue-counts",
            label: "Issue Counts By Type",
            labels: qualityIssueRows.map((row) => row.issue),
            series: [
              {
                data: qualityIssueRows.map((row) => row.count),
                key: "rows",
                label: "Rows",
              },
            ],
          },
        ],
        table: qualityTable,
      },
      review: {
        cards: [
          {
            id: "pendingReview",
            label: "Pending Review",
            unit: "teams",
            value: pendingReviewTeams,
          },
          {
            id: "reviewCoverage",
            label: "Review Coverage",
            unit: "percent",
            value: reviewCoveragePercent,
          },
          {
            id: "oldestPendingDays",
            label: "Oldest Pending Days",
            unit: "days",
            value: oldestPendingDays,
          },
          {
            id: "submittedButNotReviewed",
            label: "Submitted But Not Reviewed",
            unit: "teams",
            value: submittedButNotReviewed,
          },
        ],
        charts: [
          {
            chartType: "bar",
            id: "review-queue-age-bands",
            label: "Review Queue Age Bands",
            labels: queueAgeLabels,
            series: [
              {
                data: queueAgeValues,
                key: "teams",
                label: "Teams",
              },
            ],
          },
        ],
        table: reviewTable,
      },
    },
    summary: [
      {
        id: "pendingReview",
        label: "Pending Review",
        unit: "teams",
        value: pendingReviewTeams,
      },
      {
        id: "oldestPendingDays",
        label: "Oldest Pending",
        unit: "days",
        value: oldestPendingDays,
      },
      {
        id: "pendingSubmissions",
        label: "Pending Submissions",
        unit: "teams",
        value: pendingSubmissions,
      },
      {
        id: "anomalyRate",
        label: "Anomaly Rate",
        unit: "percent",
        value: anomalyRatePercent,
      },
    ],
  };

  return {
    exportTables,
    response,
  };
};

const getComputedRegistrationStatsV2 = async (
  queryInput?: Partial<StatsV2QueryInput>,
): Promise<ServiceResult<ComputedStatsV2>> => {
  const query = normalizeStatsV2QueryInput(queryInput);

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

  return ok(
    buildComputedStats({
      excludedEmails,
      excludedRows,
      filteredContexts,
      query,
      totalRowsBeforeFilters: rowContexts.length,
    }),
  );
};

export const getRegistrationStatsV2 = async (
  queryInput?: Partial<StatsV2QueryInput>,
): Promise<ServiceResult<RegistrationStatsV2Response>> => {
  const result = await getComputedRegistrationStatsV2(queryInput);
  if (!result.ok) {
    return result;
  }

  return ok(result.data.response, result.status);
};

export const getRegistrationStatsV2ExportTable = async ({
  dataset,
  queryInput,
}: {
  dataset: StatsV2ExportDataset;
  queryInput?: Partial<StatsV2QueryInput>;
}): Promise<ServiceResult<RegistrationStatsV2Table>> => {
  const result = await getComputedRegistrationStatsV2(queryInput);
  if (!result.ok) {
    return result;
  }

  return ok(result.data.exportTables[dataset], result.status);
};
