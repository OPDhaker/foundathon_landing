import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  parseStatsQueryInputFromUrl,
  STATS_LIMIT_MAX,
} from "@/app/stats/stats-filters";
import {
  STATS_DATASET_VIEW_MAP,
  STATS_EXPORT_DATASETS,
  type StatsExportDataset,
} from "@/app/stats/stats-views";
import {
  getFoundathonStatsApiKey,
  getFoundathonStatsPageKey,
} from "@/server/env";
import { jsonError } from "@/server/http/response";
import { getRegistrationStats } from "@/server/registration-stats/service";

const STATS_KEY_HEADER = "x-foundathon-stats-key";

const isValidStatsApiKey = ({
  expected,
  provided,
}: {
  expected: string;
  provided: string;
}) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
};

const isStatsExportDataset = (
  value: string | null,
): value is StatsExportDataset =>
  typeof value === "string" &&
  STATS_EXPORT_DATASETS.includes(value as StatsExportDataset);

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
  const expectedApiKey = getFoundathonStatsApiKey()?.trim();
  const expectedPageKey = getFoundathonStatsPageKey()?.trim();
  if (!expectedApiKey && !expectedPageKey) {
    return jsonError("Stats API key is not configured.", 500);
  }

  const providedApiKey = request.headers.get(STATS_KEY_HEADER)?.trim();
  const providedPageKey = request.nextUrl.searchParams.get("key")?.trim();

  const hasValidApiKey =
    Boolean(expectedApiKey) &&
    Boolean(providedApiKey) &&
    isValidStatsApiKey({
      expected: expectedApiKey as string,
      provided: providedApiKey as string,
    });
  const hasValidPageKey =
    Boolean(expectedPageKey) &&
    Boolean(providedPageKey) &&
    isValidStatsApiKey({
      expected: expectedPageKey as string,
      provided: providedPageKey as string,
    });

  if (!hasValidApiKey && !hasValidPageKey) {
    return jsonError("Unauthorized", 401);
  }

  const datasetParam = request.nextUrl.searchParams.get("dataset");
  if (!isStatsExportDataset(datasetParam)) {
    return jsonError("Invalid dataset query parameter.", 400);
  }

  const query = parseStatsQueryInputFromUrl(request.nextUrl.searchParams);
  if (!request.nextUrl.searchParams.get("limit")) {
    query.limit = STATS_LIMIT_MAX;
  }
  query.view = STATS_DATASET_VIEW_MAP[datasetParam];

  const result = await getRegistrationStats(query);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const targetView = STATS_DATASET_VIEW_MAP[datasetParam];
  const payload = result.data.views[targetView];
  const csv = toCsv({
    columns: payload.table.columns,
    rows: payload.table.rows,
  });
  const dateLabel = new Date().toISOString().slice(0, 10);
  const fileName = `foundathon-stats-${datasetParam}-${dateLabel}.csv`;

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
    status: 200,
  });
}
