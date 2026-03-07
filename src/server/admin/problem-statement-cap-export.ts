import { EVENT_ID } from "@/server/registration/constants";
import {
  type RegistrationRow,
  toSrmEmailNetId,
  toTeamRecord,
} from "@/server/registration/mappers";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";

const REGISTRATION_TABLE = "eventsregistrations";

export const ADMIN_PROBLEM_STATEMENT_CAP_EXPORT_DATASETS = [
  "accepted-team-leads",
  "accepted-srm-members",
] as const;

export type AdminProblemStatementCapExportDataset =
  (typeof ADMIN_PROBLEM_STATEMENT_CAP_EXPORT_DATASETS)[number];

export type AdminProblemStatementCapExportRow = Record<string, string | null>;

export type AdminProblemStatementCapExportTable = {
  columns: string[];
  rows: AdminProblemStatementCapExportRow[];
};

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

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toTrimmedString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toPhoneNumber = (value: unknown) => {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.trunc(value) > 0
  ) {
    return String(Math.trunc(value));
  }

  return toTrimmedString(value);
};

const isAcceptedApprovalStatus = (value: unknown) =>
  typeof value === "string" && value.trim().toLowerCase() === "accepted";

const toDetailsRecord = (details: unknown): Record<string, unknown> =>
  isObjectRecord(details) ? details : {};

const toProblemStatementNumber = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : null;

const toTeamTypeLabel = (value: string | null) => {
  switch (value) {
    case "srm":
      return "SRM";
    case "non_srm":
      return "Non-SRM";
    default:
      return value;
  }
};

const toDepartment = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : null;

const listAcceptedRegistrationRows = async (): Promise<
  ServiceResult<RegistrationRow[]>
> => {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return fail("Supabase service role client is not configured.", 500);
  }

  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select("id, created_at, is_approved, details")
    .eq("event_id", EVENT_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(error.message || "Failed to load registrations.", 500);
  }

  return ok(
    ((data ?? []) as RegistrationRow[]).filter((row) =>
      isAcceptedApprovalStatus(row.is_approved),
    ),
  );
};

const buildAcceptedTeamLeadsRows = (
  rows: RegistrationRow[],
): AdminProblemStatementCapExportRow[] =>
  rows.map((row) => {
    const details = toDetailsRecord(row.details);
    const lead = isObjectRecord(details.lead) ? details.lead : null;
    const team = toTeamRecord(row);
    const rawLeadNetId = lead ? toTrimmedString(lead.netId) : null;

    if (team?.teamType === "srm") {
      return {
        "Lead College Email": null,
        "Lead College ID": null,
        "Lead Contact": String(team.lead.contact),
        "Lead Department": team.lead.dept,
        "Lead Name": team.lead.name,
        "Lead RA Number": team.lead.raNumber,
        "Lead SRM Email": toSrmEmailNetId(team.lead.netId),
        "Problem Statement Number": toProblemStatementNumber(
          team.problemStatementId ?? null,
        ),
        "Problem Statement Title": team.problemStatementTitle ?? null,
        "Team Name": team.teamName,
        "Team Type": toTeamTypeLabel(team.teamType),
      };
    }

    if (team?.teamType === "non_srm") {
      return {
        "Lead College Email": team.lead.collegeEmail,
        "Lead College ID": team.lead.collegeId,
        "Lead Contact": String(team.lead.contact),
        "Lead Department": null,
        "Lead Name": team.lead.name,
        "Lead RA Number": null,
        "Lead SRM Email": null,
        "Problem Statement Number": toProblemStatementNumber(
          team.problemStatementId ?? null,
        ),
        "Problem Statement Title": team.problemStatementTitle ?? null,
        "Team Name": team.teamName,
        "Team Type": toTeamTypeLabel(team.teamType),
      };
    }

    return {
      "Lead College Email": lead ? toTrimmedString(lead.collegeEmail) : null,
      "Lead College ID": lead ? toTrimmedString(lead.collegeId) : null,
      "Lead Contact": lead ? toPhoneNumber(lead.contact) : null,
      "Lead Department": lead ? toDepartment(lead.dept) : null,
      "Lead Name": lead ? toTrimmedString(lead.name) : null,
      "Lead RA Number": lead ? toTrimmedString(lead.raNumber) : null,
      "Lead SRM Email":
        rawLeadNetId &&
        toTrimmedString(details.teamType)?.toLowerCase() === "srm"
          ? toSrmEmailNetId(rawLeadNetId)
          : null,
      "Problem Statement Number": toProblemStatementNumber(
        toTrimmedString(details.problemStatementId),
      ),
      "Problem Statement Title": toTrimmedString(details.problemStatementTitle),
      "Team Name": toTrimmedString(details.teamName) ?? "Unnamed Team",
      "Team Type": toTeamTypeLabel(
        toTrimmedString(details.teamType)?.toLowerCase() ?? null,
      ),
    };
  });

const buildAcceptedSrmMembersRows = (
  rows: RegistrationRow[],
): AdminProblemStatementCapExportRow[] =>
  rows.flatMap((row) => {
    const team = toTeamRecord(row);
    if (!team || team.teamType !== "srm") {
      return [];
    }

    return [
      {
        Department: team.lead.dept,
        "Participant Name": team.lead.name,
        "Problem Statement Number": toProblemStatementNumber(
          team.problemStatementId ?? null,
        ),
        "Problem Statement Title": team.problemStatementTitle ?? null,
        "RA Number": team.lead.raNumber,
        Role: "Lead",
        "SRM Email": toSrmEmailNetId(team.lead.netId),
        "Team Name": team.teamName,
      },
      ...team.members.map((member) => ({
        Department: member.dept,
        "Participant Name": member.name,
        "Problem Statement Number": toProblemStatementNumber(
          team.problemStatementId ?? null,
        ),
        "Problem Statement Title": team.problemStatementTitle ?? null,
        "RA Number": member.raNumber,
        Role: "Member",
        "SRM Email": toSrmEmailNetId(member.netId),
        "Team Name": team.teamName,
      })),
    ];
  });

export const getAdminProblemStatementCapExportTable = async ({
  dataset,
}: {
  dataset: AdminProblemStatementCapExportDataset;
}): Promise<ServiceResult<AdminProblemStatementCapExportTable>> => {
  const acceptedRowsResult = await listAcceptedRegistrationRows();
  if (!acceptedRowsResult.ok) {
    return acceptedRowsResult;
  }

  switch (dataset) {
    case "accepted-team-leads":
      return ok({
        columns: [
          "Team Name",
          "Team Type",
          "Problem Statement Number",
          "Problem Statement Title",
          "Lead Name",
          "Lead Contact",
          "Lead Department",
          "Lead RA Number",
          "Lead SRM Email",
          "Lead College ID",
          "Lead College Email",
        ],
        rows: buildAcceptedTeamLeadsRows(acceptedRowsResult.data),
      });
    case "accepted-srm-members":
      return ok({
        columns: [
          "Team Name",
          "Problem Statement Number",
          "Problem Statement Title",
          "Participant Name",
          "Role",
          "RA Number",
          "Department",
          "SRM Email",
        ],
        rows: buildAcceptedSrmMembersRows(acceptedRowsResult.data),
      });
  }
};
