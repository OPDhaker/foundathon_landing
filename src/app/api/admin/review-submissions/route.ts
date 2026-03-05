import type { NextRequest } from "next/server";
import { PROBLEM_STATEMENTS } from "@/data/problem-statements";
import { hasAdminReviewAccess } from "@/server/admin/review-access";
import { listAdminReviewSubmissions } from "@/server/admin/review-submissions";
import { getRouteAuthContext } from "@/server/auth/context";
import { jsonError, jsonNoStore } from "@/server/http/response";

const allowedStatementIds = new Set(PROBLEM_STATEMENTS.map((item) => item.id));

type AdminAuthResult = {
  response: Response | null;
};

const getAdminAuthErrorResponse = async (): Promise<AdminAuthResult> => {
  const context = await getRouteAuthContext();
  if (!context.ok) {
    return { response: context.response };
  }

  if (!(await hasAdminReviewAccess(context.user.email))) {
    return { response: jsonError("Forbidden", 403) };
  }

  return { response: null };
};

const parseStatementFilter = (request: NextRequest) => {
  const statement = request.nextUrl.searchParams.get("statement");
  if (!statement || statement === "all") {
    return { ok: true, statement: "all" as const };
  }

  const normalized = statement.trim().toLowerCase();
  if (!allowedStatementIds.has(normalized)) {
    return { error: "Invalid statement filter.", ok: false as const };
  }

  return { ok: true as const, statement: normalized };
};

export async function GET(request: NextRequest) {
  const auth = await getAdminAuthErrorResponse();
  if (auth.response) {
    return auth.response;
  }

  const statementParseResult = parseStatementFilter(request);
  if (!statementParseResult.ok) {
    return jsonError(statementParseResult.error, 400);
  }

  const result = await listAdminReviewSubmissions({
    statement: statementParseResult.statement,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonNoStore(result.data, result.status);
}
