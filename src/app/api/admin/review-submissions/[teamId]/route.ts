import type { NextRequest } from "next/server";
import { z } from "zod";
import { hasAdminReviewAccess } from "@/server/admin/review-access";
import { updateAdminReviewDecision } from "@/server/admin/review-submissions";
import { getRouteAuthContext } from "@/server/auth/context";
import { isJsonRequest, parseJsonSafely } from "@/server/http/request";
import { jsonError, jsonNoStore } from "@/server/http/response";
import { UUID_PATTERN } from "@/server/registration/constants";
import { enforceSameOrigin } from "@/server/security/csrf";

type Params = { params: Promise<{ teamId: string }> };

const updateDecisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

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

export async function PATCH(request: NextRequest, { params }: Params) {
  const csrfResponse = enforceSameOrigin(request);
  if (csrfResponse) {
    return csrfResponse;
  }

  const auth = await getAdminAuthErrorResponse();
  if (auth.response) {
    return auth.response;
  }

  const { teamId } = await params;
  if (!UUID_PATTERN.test(teamId)) {
    return jsonError("Team id is invalid.", 400);
  }

  if (!isJsonRequest(request)) {
    return jsonError("Content-Type must be application/json.", 415);
  }

  const body = await parseJsonSafely(request);
  if (body === null) {
    return jsonError("Invalid JSON payload.", 400);
  }

  const parsed = updateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const result = await updateAdminReviewDecision({
    decision: parsed.data.decision,
    teamId,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonNoStore(result.data, result.status);
}
