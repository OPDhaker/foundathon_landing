import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PROBLEM_STATEMENTS } from "@/data/problem-statements";
import { hasAdminReviewAccess } from "@/server/admin/review-access";
import { isBlockedLoginEmail } from "@/server/auth/email-policy";
import { EVENT_ID } from "@/server/registration/constants";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";
import { createClient } from "@/utils/supabase/server";
import AdminReviewClient, {
  type AdminTeamContactRow,
} from "./admin-review-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADMIN_ROUTE = "/admin";
const REGISTRATION_TABLE = "eventsregistrations";

type TeamContactRow = {
  details?: unknown;
  id: string;
};

const statementTitleById = new Map(
  PROBLEM_STATEMENTS.map((statement) => [statement.id, statement.title]),
);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toDetailsRecord = (details: unknown): Record<string, unknown> =>
  isObjectRecord(details) ? details : {};

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

const toMemberPhones = (details: Record<string, unknown>) => {
  const members = Array.isArray(details.members) ? details.members : [];
  const memberPhones = members
    .map((member) => {
      if (!isObjectRecord(member)) {
        return null;
      }

      return toPhoneNumber(member.contact);
    })
    .filter((phone): phone is string => Boolean(phone));

  return [...new Set(memberPhones)];
};

const hasSubmittedPresentation = (details: Record<string, unknown>) =>
  Boolean(
    toTrimmedString(details.presentationPublicUrl) &&
      toTrimmedString(details.presentationUploadedAt),
  );

const toTeamContactRow = (row: TeamContactRow): AdminTeamContactRow => {
  const details = toDetailsRecord(row.details);
  const lead = isObjectRecord(details.lead) ? details.lead : null;
  const statementId = toTrimmedString(
    details.problemStatementId,
  )?.toLowerCase();
  const statementTitle =
    toTrimmedString(details.problemStatementTitle) ??
    (statementId ? (statementTitleById.get(statementId) ?? null) : null);

  return {
    id: row.id,
    leadPhone: lead ? toPhoneNumber(lead.contact) : null,
    memberPhones: toMemberPhones(details),
    problemStatementNumber: statementId ? statementId.toUpperCase() : null,
    problemStatementTitle: statementTitle,
    submissionStatus: hasSubmittedPresentation(details)
      ? "submitted"
      : "non_submitted",
    teamName: toTrimmedString(details.teamName) ?? "Unnamed Team",
  };
};

const getInitialTeamContacts = async (): Promise<AdminTeamContactRow[]> => {
  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select("id, details")
    .eq("event_id", EVENT_ID)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return ((data ?? []) as TeamContactRow[]).map((row) => toTeamContactRow(row));
};

export default async function AdminReviewPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    notFound();
  }

  const supabase = await createClient(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || isBlockedLoginEmail(user.email)) {
    redirect(`/api/auth/login?next=${encodeURIComponent(ADMIN_ROUTE)}`);
  }

  if (!(await hasAdminReviewAccess(user.email))) {
    notFound();
  }

  const initialTeamContacts = await getInitialTeamContacts();

  return (
    <AdminReviewClient
      adminEmail={user.email ?? ""}
      initialTeamContacts={initialTeamContacts}
    />
  );
}
