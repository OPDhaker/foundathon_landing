import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { parseStatsV2QueryInputFromUrl } from "@/app/stats-v2/stats-v2-filters";
import { getFoundathonStatsApiKey } from "@/server/env";
import { jsonError, jsonNoStore } from "@/server/http/response";
import { getRegistrationStatsV2 } from "@/server/registration-stats/service-v2";

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

export async function GET(request: NextRequest) {
  const expectedApiKey = getFoundathonStatsApiKey()?.trim();
  if (!expectedApiKey) {
    return jsonError("Stats API key is not configured.", 500);
  }

  const providedApiKey = request.headers.get(STATS_KEY_HEADER)?.trim();
  if (!providedApiKey) {
    return jsonError("Unauthorized", 401);
  }

  if (
    !isValidStatsApiKey({ expected: expectedApiKey, provided: providedApiKey })
  ) {
    return jsonError("Unauthorized", 401);
  }

  const query = parseStatsV2QueryInputFromUrl(request.nextUrl.searchParams);
  const result = await getRegistrationStatsV2(query);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonNoStore(result.data, result.status);
}
