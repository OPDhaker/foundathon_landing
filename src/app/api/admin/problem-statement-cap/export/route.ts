import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  ADMIN_PROBLEM_STATEMENT_CAP_EXPORT_DATASETS,
  getAdminProblemStatementCapExportTable,
} from "@/server/admin/problem-statement-cap-export";
import { getRouteAuthContext } from "@/server/auth/context";
import { isFoundathonAdminEmail } from "@/server/env";
import { jsonError } from "@/server/http/response";

const datasetSchema = z.enum(ADMIN_PROBLEM_STATEMENT_CAP_EXPORT_DATASETS);

const toCsvCell = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value);
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
};

const toCsv = ({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Record<string, number | string | null>>;
}) => {
  const header = columns.map(toCsvCell).join(",");
  const dataRows = rows.map((row) =>
    columns.map((column) => toCsvCell(row[column])).join(","),
  );

  return [header, ...dataRows].join("\n");
};

export async function GET(request: NextRequest) {
  const context = await getRouteAuthContext();
  if (!context.ok) {
    return context.response;
  }

  if (!isFoundathonAdminEmail(context.user.email)) {
    return jsonError("Forbidden", 403);
  }

  const parsedDataset = datasetSchema.safeParse(
    request.nextUrl.searchParams.get("dataset"),
  );
  if (!parsedDataset.success) {
    return jsonError("Invalid dataset query parameter.", 400);
  }

  const result = await getAdminProblemStatementCapExportTable({
    dataset: parsedDataset.data,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const csv = toCsv({
    columns: result.data.columns,
    rows: result.data.rows,
  });
  const dateLabel = new Date().toISOString().slice(0, 10);
  const fileName = `foundathon-admin-problem-statement-cap-${parsedDataset.data}-${dateLabel}.csv`;

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
    status: 200,
  });
}
