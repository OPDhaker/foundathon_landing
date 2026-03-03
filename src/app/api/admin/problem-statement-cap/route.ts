import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRouteAuthContext } from "@/server/auth/context";
import { isFoundathonAdminEmail } from "@/server/env";
import { isJsonRequest, parseJsonSafely } from "@/server/http/request";
import { jsonError, jsonNoStore } from "@/server/http/response";
import {
  getProblemStatementCap,
  getRegistrationsOpen,
  updateProblemStatementCap,
  updateRegistrationsOpen,
} from "@/server/problem-statements/cap-settings";
import { enforceSameOrigin } from "@/server/security/csrf";

const updateCapSchema = z.object({
  cap: z
    .number()
    .int()
    .positive("Cap must be a positive integer.")
    .max(10_000, "Cap is too large."),
});

const updateRegistrationsOpenSchema = z.object({
  registrationsOpen: z.boolean(),
});

const updateSettingsSchema = z.union([
  updateCapSchema.strict(),
  updateRegistrationsOpenSchema.strict(),
]);

type AdminAuthResult = {
  response: Response | null;
};

const getAdminAuthErrorResponse = async () => {
  const result: AdminAuthResult = {
    response: null,
  };

  const context = await getRouteAuthContext();
  if (!context.ok) {
    result.response = context.response;
    return result;
  }

  if (!isFoundathonAdminEmail(context.user.email)) {
    result.response = jsonError("Forbidden", 403);
    return result;
  }

  return result;
};

export async function GET() {
  const auth = await getAdminAuthErrorResponse();
  if (auth.response) {
    return auth.response;
  }

  const [cap, registrationsOpen] = await Promise.all([
    getProblemStatementCap({ useCache: false }),
    getRegistrationsOpen({ useCache: false }),
  ]);

  return jsonNoStore({ cap, registrationsOpen }, 200);
}

export async function PATCH(request: NextRequest) {
  const csrfResponse = enforceSameOrigin(request);
  if (csrfResponse) {
    return csrfResponse;
  }

  const auth = await getAdminAuthErrorResponse();
  if (auth.response) {
    return auth.response;
  }

  if (!isJsonRequest(request)) {
    return jsonError("Content-Type must be application/json.", 415);
  }

  const body = await parseJsonSafely(request);
  if (body === null) {
    return jsonError("Invalid JSON payload.", 400);
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  if ("cap" in parsed.data) {
    const updated = await updateProblemStatementCap(parsed.data.cap);
    if (!updated.ok) {
      return jsonError(updated.error, updated.status);
    }

    const registrationsOpen = await getRegistrationsOpen({ useCache: false });
    return jsonNoStore({ cap: updated.cap, registrationsOpen }, 200);
  }

  const updated = await updateRegistrationsOpen(parsed.data.registrationsOpen);
  if (!updated.ok) {
    return jsonError(updated.error, updated.status);
  }

  const cap = await getProblemStatementCap({ useCache: false });
  return jsonNoStore(
    { cap, registrationsOpen: updated.registrationsOpen },
    200,
  );
}
