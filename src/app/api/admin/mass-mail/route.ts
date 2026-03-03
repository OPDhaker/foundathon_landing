import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRouteAuthContext } from "@/server/auth/context";
import { isFoundathonAdminEmail } from "@/server/env";
import { isJsonRequest, parseJsonSafely } from "@/server/http/request";
import { jsonError, jsonNoStore } from "@/server/http/response";
import { sendMissingPptReminderMassMail } from "@/server/mass-mail/ppt-reminder";
import { enforceSameOrigin } from "@/server/security/csrf";

const sendMassMailSchema = z.object({
  testEmails: z.array(z.string().trim().email()).max(20).optional(),
  useTestMail: z.boolean(),
});

type AdminAuthResult = {
  response: Response | null;
  userEmail: string;
};

const getAdminAuthResult = async (): Promise<AdminAuthResult> => {
  const context = await getRouteAuthContext();
  if (!context.ok) {
    return {
      response: context.response,
      userEmail: "",
    };
  }

  const userEmail =
    typeof context.user.email === "string" ? context.user.email : "";

  if (!isFoundathonAdminEmail(userEmail)) {
    return {
      response: jsonError("Forbidden", 403),
      userEmail: "",
    };
  }

  return {
    response: null,
    userEmail,
  };
};

export async function POST(request: NextRequest) {
  const csrfResponse = enforceSameOrigin(request);
  if (csrfResponse) {
    return csrfResponse;
  }

  const auth = await getAdminAuthResult();
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

  const parsed = sendMassMailSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const mode = parsed.data.useTestMail ? "test" : "live";
  const result = await sendMissingPptReminderMassMail({
    adminEmail: auth.userEmail,
    mode,
    ...(mode === "test" && parsed.data.testEmails?.length
      ? { testEmails: parsed.data.testEmails }
      : {}),
  });

  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonNoStore(result, 200);
}
