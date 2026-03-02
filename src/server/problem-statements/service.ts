import {
  getProblemStatementById,
  PROBLEM_STATEMENTS,
} from "@/data/problem-statements";
import { createProblemLockToken } from "@/lib/problem-lock-token";
import {
  buildProblemStatementCounts,
  countProblemStatementRegistrations,
  type ProblemStatementCountRow,
} from "@/lib/problem-statement-availability";
import { getProblemStatementCap } from "@/server/problem-statements/cap-settings";
import { listProblemStatementRows } from "@/server/registration/repository";
import type { RouteSupabaseClient } from "@/server/supabase/route-client";

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

export const listProblemStatementAvailability = async ({
  supabase,
}: {
  supabase: RouteSupabaseClient;
}): Promise<
  ServiceResult<{
    statements: Array<{
      id: string;
      isFull: boolean;
      summary: string;
      title: string;
    }>;
  }>
> => {
  const statementCap = await getProblemStatementCap();
  const { data, error } = await listProblemStatementRows(supabase);

  if (error) {
    return fail("Failed to fetch problem statement availability.", 500);
  }

  const counts = buildProblemStatementCounts(
    (data ?? []) as ProblemStatementCountRow[],
  );

  return ok({
    statements: PROBLEM_STATEMENTS.map((statement) => {
      const registeredCount = counts.get(statement.id) ?? 0;

      return {
        id: statement.id,
        isFull: registeredCount >= statementCap,
        summary: statement.summary,
        title: statement.title,
      };
    }),
  });
};

export const lockProblemStatementForUser = async ({
  problemStatementId,
  supabase,
  userId,
}: {
  problemStatementId: string;
  supabase: RouteSupabaseClient;
  userId: string;
}): Promise<
  ServiceResult<{
    lockExpiresAt: string;
    lockToken: string;
    locked: true;
    problemStatement: {
      id: string;
      title: string;
    };
  }>
> => {
  const problemStatement = getProblemStatementById(problemStatementId);
  const statementCap = await getProblemStatementCap();

  if (!problemStatement) {
    return fail("Problem statement not found.", 400);
  }

  const { data, error } = await listProblemStatementRows(supabase);

  if (error) {
    return fail("Failed to check statement availability.", 500);
  }

  const registeredCount = countProblemStatementRegistrations(
    (data ?? []) as ProblemStatementCountRow[],
    problemStatement.id,
  );

  if (registeredCount >= statementCap) {
    return fail("This problem statement is currently unavailable.", 409);
  }

  let token: ReturnType<typeof createProblemLockToken>;
  try {
    token = createProblemLockToken({
      problemStatementId: problemStatement.id,
      userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate lock token.";
    return fail(message, 500);
  }

  return ok({
    lockExpiresAt: token.expiresAt,
    lockToken: token.token,
    locked: true,
    problemStatement: {
      id: problemStatement.id,
      title: problemStatement.title,
    },
  });
};
