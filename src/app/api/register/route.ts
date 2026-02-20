import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getProblemStatementById,
  PROBLEM_STATEMENT_CAP,
} from "@/data/problem-statements";
import { verifyProblemLockToken } from "@/lib/problem-lock-token";
import {
  countProblemStatementRegistrations,
  type ProblemStatementCountRow,
} from "@/lib/problem-statement-availability";
import {
  createSupabaseClient,
  EVENT_ID,
  EVENT_TITLE,
  getSupabaseCredentials,
  JSON_HEADERS,
  type RegistrationRow,
  toTeamSummary,
  UUID_PATTERN,
  withSrmEmailNetIds,
} from "@/lib/register-api";
import { teamSubmissionSchema } from "@/lib/register-schema";

const createTeamRequestSchema = z.object({
  lockToken: z.string().trim().min(1, "Lock token is required."),
  problemStatementId: z
    .string()
    .trim()
    .min(1, "Problem statement is required."),
  team: teamSubmissionSchema,
});

const isJsonRequest = (request: NextRequest) =>
  request.headers.get("content-type")?.includes("application/json");

const parseRequestJson = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const missingSupabaseConfigResponse = () =>
  NextResponse.json(
    { error: "Supabase environment variables are not configured." },
    { headers: JSON_HEADERS, status: 500 },
  );

export async function GET() {
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: JSON_HEADERS, status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, updated_at, details")
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch registrations." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const teams = ((data ?? []) as RegistrationRow[]).map((row) =>
    toTeamSummary(row),
  );
  return NextResponse.json({ teams }, { headers: JSON_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { headers: JSON_HEADERS, status: 415 },
    );
  }

  const body = await parseRequestJson(request);
  if (body === null) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  const parsed = createTeamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: JSON_HEADERS, status: 401 },
    );
  }

  const problemStatement = getProblemStatementById(
    parsed.data.problemStatementId,
  );

  if (!problemStatement) {
    return NextResponse.json(
      { error: "Problem statement not found." },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  const lockVerification = verifyProblemLockToken({
    problemStatementId: problemStatement.id,
    token: parsed.data.lockToken,
    userId: user.id,
  });

  if (!lockVerification.valid) {
    return NextResponse.json(
      { error: lockVerification.error },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  const teamDetails = withSrmEmailNetIds(parsed.data.team);
  const details = {
    ...teamDetails,
    problemStatementCap: PROBLEM_STATEMENT_CAP,
    problemStatementId: problemStatement.id,
    problemStatementLockedAt: new Date(
      lockVerification.payload.iat,
    ).toISOString(),
    problemStatementTitle: problemStatement.title,
  };

  const { data: existingRegistration, error: existingRegistrationError } =
    await supabase
      .from("eventsregistrations")
      .select("id")
      .eq("event_id", EVENT_ID)
      .eq("application_id", user.id)
      .maybeSingle();

  if (existingRegistrationError) {
    return NextResponse.json(
      { error: "Failed to validate existing registrations." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  if (existingRegistration) {
    return NextResponse.json(
      { error: "You have already registered for this event." },
      { headers: JSON_HEADERS, status: 409 },
    );
  }

  const { data: statementRows, error: statementRowsError } = await supabase
    .from("eventsregistrations")
    .select("details")
    .eq("event_id", EVENT_ID);

  if (statementRowsError) {
    return NextResponse.json(
      { error: "Failed to check statement availability." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const registeredCount = countProblemStatementRegistrations(
    (statementRows ?? []) as ProblemStatementCountRow[],
    problemStatement.id,
  );

  if (registeredCount >= PROBLEM_STATEMENT_CAP) {
    return NextResponse.json(
      { error: "This problem statement is currently unavailable." },
      { headers: JSON_HEADERS, status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .insert([
      {
        application_id: user.id,
        details,
        event_id: EVENT_ID,
        event_title: EVENT_TITLE,
        is_team_entry: true,
        registration_email: user.email ?? "",
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create registration." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const teamId = typeof data.id === "string" ? data.id : null;

  if (!teamId || !UUID_PATTERN.test(teamId)) {
    return NextResponse.json(
      { error: "Failed to create registration." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  return NextResponse.json(
    {
      team: { id: teamId },
    },
    { headers: JSON_HEADERS, status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Team id is required." },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { headers: JSON_HEADERS, status: 400 },
    );
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return missingSupabaseConfigResponse();
  }

  const supabase = await createSupabaseClient(credentials);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { headers: JSON_HEADERS, status: 401 },
    );
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("eventsregistrations")
    .delete()
    .eq("id", id)
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove team." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  if (!deleted) {
    return NextResponse.json(
      { error: "Team not found." },
      { headers: JSON_HEADERS, status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("id, created_at, updated_at, details")
    .eq("event_id", EVENT_ID)
    .eq("application_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete team." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const teams = ((data ?? []) as RegistrationRow[]).map((row) =>
    toTeamSummary(row),
  );
  return NextResponse.json({ teams }, { headers: JSON_HEADERS });
}
