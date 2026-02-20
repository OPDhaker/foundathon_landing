import { NextResponse } from "next/server";
import {
  PROBLEM_STATEMENT_CAP,
  PROBLEM_STATEMENTS,
} from "@/data/problem-statements";
import {
  buildProblemStatementCounts,
  type ProblemStatementCountRow,
} from "@/lib/problem-statement-availability";
import {
  createSupabaseClient,
  EVENT_ID,
  getSupabaseCredentials,
  JSON_HEADERS,
} from "@/lib/register-api";

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
    .select("details")
    .eq("event_id", EVENT_ID);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch problem statement availability." },
      { headers: JSON_HEADERS, status: 500 },
    );
  }

  const counts = buildProblemStatementCounts(
    (data ?? []) as ProblemStatementCountRow[],
  );

  return NextResponse.json(
    {
      statements: PROBLEM_STATEMENTS.map((statement) => {
        const registeredCount = counts.get(statement.id) ?? 0;

        return {
          id: statement.id,
          isFull: registeredCount >= PROBLEM_STATEMENT_CAP,
          summary: statement.summary,
          title: statement.title,
        };
      }),
    },
    { headers: JSON_HEADERS },
  );
}
