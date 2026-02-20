export type ProblemStatementCountRow = {
  details: Record<string, unknown> | null;
};

export const getProblemStatementIdFromDetails = (
  details: Record<string, unknown> | null,
) => {
  if (!details) {
    return null;
  }

  const value = details.problemStatementId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export const buildProblemStatementCounts = (
  rows: ProblemStatementCountRow[],
) => {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const statementId = getProblemStatementIdFromDetails(row.details);
    if (!statementId) {
      continue;
    }

    counts.set(statementId, (counts.get(statementId) ?? 0) + 1);
  }

  return counts;
};

export const countProblemStatementRegistrations = (
  rows: ProblemStatementCountRow[],
  statementId: string,
) =>
  rows.reduce((total, row) => {
    const current = getProblemStatementIdFromDetails(row.details);
    return current === statementId ? total + 1 : total;
  }, 0);
