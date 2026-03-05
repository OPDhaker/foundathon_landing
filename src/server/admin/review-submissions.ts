import { PROBLEM_STATEMENTS } from "@/data/problem-statements";
import {
  sendTeamDecisionMail,
  type TeamDecisionMailDecision,
} from "@/server/mass-mail/team-decision";
import { EVENT_ID, UUID_PATTERN } from "@/server/registration/constants";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";

type ServiceSuccess<T> = {
  data: T;
  ok: true;
  status: number;
};

type ServiceFailure = {
  error: string;
  ok: false;
  status: number;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

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

const REGISTRATION_TABLE = "eventsregistrations";

export type AdminReviewStatementFilter =
  | "all"
  | (typeof PROBLEM_STATEMENTS)[number]["id"];

export type AdminReviewApprovalStatus = "accepted" | "rejected" | "submitted";

export type AdminReviewTab = {
  count: number;
  id: "all" | string;
  label: string;
};

export type AdminReviewSubmissionTeam = {
  approvalStatus: AdminReviewApprovalStatus;
  id: string;
  leadName: string;
  presentationFileName: string;
  presentationPublicUrl: string;
  presentationUploadedAt: string;
  problemStatementId: string | null;
  problemStatementTitle: string | null;
  registrationEmail: string;
  teamName: string;
};

export type AdminReviewSubmissionsPayload = {
  statement: AdminReviewStatementFilter;
  tabs: AdminReviewTab[];
  teams: AdminReviewSubmissionTeam[];
};

type AdminReviewRow = {
  details?: unknown;
  id: string;
  is_approved?: string | null;
  registration_email?: string | null;
};

const statementTitleById = new Map(
  PROBLEM_STATEMENTS.map((statement) => [statement.id, statement.title]),
);

const toTrimmedString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toDetailsRecord = (details: unknown): Record<string, unknown> =>
  details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {};

const hasSubmittedPresentation = (details: Record<string, unknown>) =>
  Boolean(
    toTrimmedString(details.presentationPublicUrl) &&
      toTrimmedString(details.presentationUploadedAt),
  );

const toApprovalStatus = (value: unknown): AdminReviewApprovalStatus => {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "accepted" || normalized === "rejected") {
    return normalized;
  }

  return "submitted";
};

const toDatabaseApprovalStatus = (
  decision: TeamDecisionMailDecision,
): "ACCEPTED" | "REJECTED" =>
  decision === "accepted" ? "ACCEPTED" : "REJECTED";

const toLeadName = (details: Record<string, unknown>) => {
  const lead = details.lead;
  if (!lead || typeof lead !== "object" || Array.isArray(lead)) {
    return "Unknown Lead";
  }

  const leadName = toTrimmedString((lead as Record<string, unknown>).name);
  return leadName ?? "Unknown Lead";
};

const toTeamName = (details: Record<string, unknown>) =>
  toTrimmedString(details.teamName) ?? "Unnamed Team";

const toProblemStatementId = (details: Record<string, unknown>) =>
  toTrimmedString(details.problemStatementId);

const toProblemStatementTitle = (details: Record<string, unknown>) => {
  const stored = toTrimmedString(details.problemStatementTitle);
  if (stored) {
    return stored;
  }

  const statementId = toProblemStatementId(details);
  if (!statementId) {
    return null;
  }

  return statementTitleById.get(statementId) ?? null;
};

const toAdminReviewSubmissionTeam = (
  row: AdminReviewRow,
): AdminReviewSubmissionTeam | null => {
  const details = toDetailsRecord(row.details);
  const presentationPublicUrl = toTrimmedString(details.presentationPublicUrl);
  const presentationUploadedAt = toTrimmedString(
    details.presentationUploadedAt,
  );

  if (!presentationPublicUrl || !presentationUploadedAt) {
    return null;
  }

  const registrationEmail = toTrimmedString(row.registration_email);
  const presentationFileName = toTrimmedString(details.presentationFileName);
  const problemStatementId = toProblemStatementId(details);
  const problemStatementTitle = toProblemStatementTitle(details);

  return {
    approvalStatus: toApprovalStatus(row.is_approved),
    id: row.id,
    leadName: toLeadName(details),
    presentationFileName: presentationFileName ?? "uploaded-presentation.pptx",
    presentationPublicUrl,
    presentationUploadedAt,
    problemStatementId,
    problemStatementTitle,
    registrationEmail: registrationEmail ?? "",
    teamName: toTeamName(details),
  };
};

const sortSubmittedTeams = (
  teams: AdminReviewSubmissionTeam[],
): AdminReviewSubmissionTeam[] =>
  [...teams].sort((left, right) => {
    const leftTs = Date.parse(left.presentationUploadedAt);
    const rightTs = Date.parse(right.presentationUploadedAt);

    if (!Number.isNaN(leftTs) && !Number.isNaN(rightTs) && rightTs !== leftTs) {
      return rightTs - leftTs;
    }

    if (right.presentationUploadedAt !== left.presentationUploadedAt) {
      return right.presentationUploadedAt.localeCompare(
        left.presentationUploadedAt,
      );
    }

    return left.teamName.localeCompare(right.teamName);
  });

const buildTabs = (teams: AdminReviewSubmissionTeam[]): AdminReviewTab[] => {
  const statementCounts = new Map<string, number>();

  for (const team of teams) {
    if (!team.problemStatementId) {
      continue;
    }

    statementCounts.set(
      team.problemStatementId,
      (statementCounts.get(team.problemStatementId) ?? 0) + 1,
    );
  }

  return [
    {
      count: teams.length,
      id: "all",
      label: "All",
    },
    ...PROBLEM_STATEMENTS.map((statement) => ({
      count: statementCounts.get(statement.id) ?? 0,
      id: statement.id,
      label: statement.id.toUpperCase(),
    })),
  ];
};

export const listAdminReviewSubmissions = async ({
  statement = "all",
}: {
  statement?: AdminReviewStatementFilter;
} = {}): Promise<ServiceResult<AdminReviewSubmissionsPayload>> => {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return fail("Supabase service role client is not configured.", 500);
  }

  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select("id, is_approved, registration_email, details")
    .eq("event_id", EVENT_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(error.message || "Failed to load submitted teams.", 500);
  }

  const submittedTeams = sortSubmittedTeams(
    ((data ?? []) as AdminReviewRow[])
      .map((row) => toAdminReviewSubmissionTeam(row))
      .filter((team): team is AdminReviewSubmissionTeam => Boolean(team)),
  );

  const tabs = buildTabs(submittedTeams);
  const teams =
    statement === "all"
      ? submittedTeams
      : submittedTeams.filter((team) => team.problemStatementId === statement);

  return ok({
    statement,
    tabs,
    teams,
  });
};

export type UpdateAdminReviewDecisionPayload = {
  approvalStatus: TeamDecisionMailDecision;
  mail: {
    error?: string;
    recipient: string | null;
    sent: boolean;
  };
  teamId: string;
};

export const updateAdminReviewDecision = async ({
  decision,
  teamId,
}: {
  decision: TeamDecisionMailDecision;
  teamId: string;
}): Promise<ServiceResult<UpdateAdminReviewDecisionPayload>> => {
  if (!UUID_PATTERN.test(teamId)) {
    return fail("Team id is invalid.", 400);
  }

  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return fail("Supabase service role client is not configured.", 500);
  }

  const { data: existing, error: existingError } = await supabase
    .from(REGISTRATION_TABLE)
    .select("id, is_approved, registration_email, details")
    .eq("event_id", EVENT_ID)
    .eq("id", teamId)
    .maybeSingle();

  if (existingError) {
    return fail(existingError.message || "Failed to fetch team.", 500);
  }

  if (!existing) {
    return fail("Team not found.", 404);
  }

  const existingDetails = toDetailsRecord((existing as AdminReviewRow).details);
  if (!hasSubmittedPresentation(existingDetails)) {
    return fail("Team has not submitted PPT yet.", 409);
  }

  const currentStatus = toApprovalStatus(
    (existing as AdminReviewRow).is_approved ?? null,
  );
  const existingRecipient = toTrimmedString(
    (existing as AdminReviewRow).registration_email,
  );
  if (currentStatus === decision) {
    return ok({
      approvalStatus: decision,
      mail: {
        error: "Decision already applied. Email was not resent.",
        recipient: existingRecipient,
        sent: false,
      },
      teamId,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from(REGISTRATION_TABLE)
    .update({ is_approved: toDatabaseApprovalStatus(decision) })
    .eq("event_id", EVENT_ID)
    .eq("id", teamId)
    .select("id, is_approved, registration_email, details")
    .maybeSingle();

  if (updateError) {
    return fail(updateError.message || "Failed to update team decision.", 500);
  }

  if (!updated) {
    return fail("Team not found.", 404);
  }

  const updatedRow = updated as AdminReviewRow;
  const updatedDetails = toDetailsRecord(updatedRow.details);
  const teamName = toTeamName(updatedDetails);
  const problemStatementTitle = toProblemStatementTitle(updatedDetails);
  const mailResult = await sendTeamDecisionMail({
    decision,
    problemStatementTitle,
    recipientEmail: toTrimmedString(updatedRow.registration_email),
    teamName,
  });

  if (!mailResult.ok) {
    return ok({
      approvalStatus: decision,
      mail: {
        error: mailResult.error,
        recipient: mailResult.recipient,
        sent: false,
      },
      teamId,
    });
  }

  return ok({
    approvalStatus: decision,
    mail: {
      recipient: mailResult.recipient,
      sent: true,
    },
    teamId,
  });
};
