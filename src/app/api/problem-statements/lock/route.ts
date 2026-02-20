import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getProblemStatementById,
  PROBLEM_STATEMENT_CAP,
} from "@/data/problem-statements";
import { createProblemLockToken } from "@/lib/problem-lock-token";
import {
  countProblemStatementRegistrations,
  type ProblemStatementCountRow,
} from "@/lib/problem-statement-availability";
import {
  createSupabaseClient,
  EVENT_ID,
  getSupabaseCredentials,
  JSON_HEADERS,
} from "@/lib/register-api";

const lockRequestSchema = z.object({
  problemStatementId: z
    .string()
    .trim()
    .min(1, "Problem statement is required."),
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

  const parsed = lockRequestSchema.safeParse(body);
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

  const { data, error } = await supabase
    .from("eventsregistrations")
    .select("details")
    .eq("event_id", EVENT_ID);

  if (error) {
    return NextResponse.json(
      { error: "Failed to check statement availability." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const registeredCount = countProblemStatementRegistrations(
    (data ?? []) as ProblemStatementCountRow[],
    problemStatement.id,
  );

  if (registeredCount >= PROBLEM_STATEMENT_CAP) {
    return NextResponse.json(
      { error: "This problem statement is currently unavailable." },
      { headers: JSON_HEADERS, status: 409 },
    );
  }

  let token: ReturnType<typeof createProblemLockToken>;
  try {
    token = createProblemLockToken({
      problemStatementId: problemStatement.id,
      userId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate lock token.";
    return NextResponse.json(
      { error: message },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  return NextResponse.json(
    {
      lockExpiresAt: token.expiresAt,
      lockToken: token.token,
      locked: true,
      problemStatement: {
        id: problemStatement.id,
        title: problemStatement.title,
      },
    },
    { headers: JSON_HEADERS },
  );
}
