import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRouteAuthContext } from "@/server/auth/context";
import {
  isFoundathonAdminEmail,
  isFoundathonSuperAdminEmail,
} from "@/server/env";
import { isJsonRequest, parseJsonSafely } from "@/server/http/request";
import { jsonError, jsonNoStore } from "@/server/http/response";
import {
  getManagedReviewAdminEmails,
  getProblemStatementCap,
  getRegistrationsOpen,
  updateManagedReviewAdminEmails,
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

const updateReviewAdminAddSchema = z.object({
  reviewAdminEmailToAdd: z
    .string()
    .trim()
    .email("Review admin email is invalid."),
});

const updateReviewAdminRemoveSchema = z.object({
  reviewAdminEmailToRemove: z
    .string()
    .trim()
    .email("Review admin email is invalid."),
});

const updateSettingsSchema = z.union([
  updateCapSchema.strict(),
  updateRegistrationsOpenSchema.strict(),
  updateReviewAdminAddSchema.strict(),
  updateReviewAdminRemoveSchema.strict(),
]);

type AdminAuthResult = {
  userEmail: string | null;
  response: Response | null;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getAdminAuthErrorResponse = async () => {
  const result: AdminAuthResult = {
    response: null,
    userEmail: null,
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

  result.userEmail = context.user.email ?? null;
  return result;
};

export async function GET() {
  const auth = await getAdminAuthErrorResponse();
  if (auth.response) {
    return auth.response;
  }

  const [cap, registrationsOpen, reviewAdminEmails] = await Promise.all([
    getProblemStatementCap({ useCache: false }),
    getRegistrationsOpen({ useCache: false }),
    getManagedReviewAdminEmails({ useCache: false }),
  ]);

  return jsonNoStore({ cap, registrationsOpen, reviewAdminEmails }, 200);
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
    const capUpdate = await updateProblemStatementCap(parsed.data.cap);
    if (!capUpdate.ok) {
      return jsonError(capUpdate.error, capUpdate.status);
    }

    const [registrationsOpen, reviewAdminEmails] = await Promise.all([
      getRegistrationsOpen({ useCache: false }),
      getManagedReviewAdminEmails({ useCache: false }),
    ]);

    return jsonNoStore(
      { cap: capUpdate.cap, registrationsOpen, reviewAdminEmails },
      200,
    );
  }

  if ("registrationsOpen" in parsed.data) {
    const registrationsOpenUpdate = await updateRegistrationsOpen(
      parsed.data.registrationsOpen,
    );
    if (!registrationsOpenUpdate.ok) {
      return jsonError(
        registrationsOpenUpdate.error,
        registrationsOpenUpdate.status,
      );
    }

    const [cap, reviewAdminEmails] = await Promise.all([
      getProblemStatementCap({ useCache: false }),
      getManagedReviewAdminEmails({ useCache: false }),
    ]);

    return jsonNoStore(
      {
        cap,
        registrationsOpen: registrationsOpenUpdate.registrationsOpen,
        reviewAdminEmails,
      },
      200,
    );
  }

  if (!isFoundathonSuperAdminEmail(auth.userEmail)) {
    return jsonError("Forbidden", 403);
  }

  const currentReviewAdminEmails = await getManagedReviewAdminEmails({
    useCache: false,
  });
  const requestedEmail =
    "reviewAdminEmailToAdd" in parsed.data
      ? normalizeEmail(parsed.data.reviewAdminEmailToAdd)
      : normalizeEmail(parsed.data.reviewAdminEmailToRemove);
  const nextReviewAdminEmails =
    "reviewAdminEmailToAdd" in parsed.data
      ? [...new Set([...currentReviewAdminEmails, requestedEmail])]
      : currentReviewAdminEmails.filter((email) => email !== requestedEmail);

  const reviewAdminUpdate = await updateManagedReviewAdminEmails(
    nextReviewAdminEmails,
  );
  if (!reviewAdminUpdate.ok) {
    return jsonError(reviewAdminUpdate.error, reviewAdminUpdate.status);
  }

  const [cap, registrationsOpen] = await Promise.all([
    getProblemStatementCap({ useCache: false }),
    getRegistrationsOpen({ useCache: false }),
  ]);

  return jsonNoStore(
    {
      cap,
      registrationsOpen,
      reviewAdminEmails: reviewAdminUpdate.reviewAdminEmails,
    },
    200,
  );
}
