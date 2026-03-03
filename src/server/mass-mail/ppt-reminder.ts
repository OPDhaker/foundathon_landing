import { Resend } from "resend";
import { getProblemStatementById } from "@/data/problem-statements";
import { getFoundathonResendApiKey, getFoundathonSiteUrl } from "@/server/env";
import { EVENT_ID, EVENT_TITLE } from "@/server/registration/constants";
import { getServiceRoleSupabaseClient } from "@/server/supabase/service-role-client";

const REGISTRATION_TABLE = "eventsregistrations";
const DEFAULT_SITE_URL = "https://foundathon.thefoundersclub.tech";
const DEFAULT_FROM_EMAIL = "Foundathon 3.0 <no-reply@thefoundersclub.tech>";
const INVALID_EMAIL_ERROR = "Invalid email address.";

type RegistrationRow = {
  details?: unknown;
  registration_email?: string | null;
};

export type PendingPptRecipient = {
  email: string;
  problemStatementTitle: string | null;
  teamName: string | null;
};

type SendMode = "live" | "test";

export type SendMissingPptReminderInput = {
  adminEmail: string;
  mode: SendMode;
  testEmails?: string[];
};

export type SendMissingPptReminderResult =
  | {
      failedCount: number;
      mode: SendMode;
      ok: true;
      recipientCount: number;
      skippedSubmittedTestRecipients?: string[];
      sentCount: number;
      testRecipients?: string[];
      targetedRecipientCount: number;
      testSkippedReason?: "already_submitted";
      testRecipient: string | null;
    }
  | { error: string; ok: false; status: number };

const toTrimmedString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toNormalizedEmail = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isEmailLike = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toUniqueNormalizedEmails = (emails: string[]) => {
  const unique = new Set<string>();

  for (const email of emails) {
    const normalizedEmail = toNormalizedEmail(email);
    if (!isEmailLike(normalizedEmail)) {
      continue;
    }

    unique.add(normalizedEmail);
  }

  return [...unique];
};

const toDetailsRecord = (details: unknown): Record<string, unknown> =>
  details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {};

const toProblemStatementTitle = (details: Record<string, unknown>) => {
  const storedTitle = toTrimmedString(details.problemStatementTitle);
  if (storedTitle) {
    return storedTitle;
  }

  const statementId = toTrimmedString(details.problemStatementId);
  if (!statementId) {
    return null;
  }

  const statement = getProblemStatementById(statementId);
  return statement?.title ?? null;
};

const hasSubmittedPresentation = (details: Record<string, unknown>) =>
  Boolean(
    toTrimmedString(details.presentationUploadedAt) &&
      toTrimmedString(details.presentationPublicUrl),
  );

export const toPendingPptRecipients = (
  rows: RegistrationRow[],
): PendingPptRecipient[] => {
  const recipients = new Map<string, PendingPptRecipient>();

  for (const row of rows) {
    const email = toNormalizedEmail(row.registration_email);
    if (!isEmailLike(email)) {
      continue;
    }

    const details = toDetailsRecord(row.details);
    if (hasSubmittedPresentation(details)) {
      continue;
    }

    const existing = recipients.get(email);
    const teamName = toTrimmedString(details.teamName);
    const problemStatementTitle = toProblemStatementTitle(details);

    if (!existing) {
      recipients.set(email, {
        email,
        problemStatementTitle,
        teamName,
      });
      continue;
    }

    recipients.set(email, {
      email,
      problemStatementTitle:
        existing.problemStatementTitle ?? problemStatementTitle,
      teamName: existing.teamName ?? teamName,
    });
  }

  return [...recipients.values()];
};

export const toPendingPptRecipientEmails = (rows: RegistrationRow[]) =>
  toPendingPptRecipients(rows).map((recipient) => recipient.email);

export const toReminderRecipientsByMode = ({
  mode,
  normalizedAdminEmail,
  targetedRecipients,
}: {
  mode: SendMode;
  normalizedAdminEmail: string;
  targetedRecipients: PendingPptRecipient[];
}): PendingPptRecipient[] => {
  if (mode === "live") {
    return targetedRecipients;
  }

  const adminRecipient = targetedRecipients.find(
    (recipient) => recipient.email === normalizedAdminEmail,
  );

  return [
    {
      email: normalizedAdminEmail,
      problemStatementTitle: adminRecipient?.problemStatementTitle ?? null,
      teamName: adminRecipient?.teamName ?? null,
    },
  ];
};

export const hasEmailSubmittedPpt = ({
  email,
  rows,
}: {
  email: string;
  rows: RegistrationRow[];
}) => {
  for (const row of rows) {
    const rowEmail = toNormalizedEmail(row.registration_email);
    if (rowEmail !== email) {
      continue;
    }

    const details = toDetailsRecord(row.details);
    if (hasSubmittedPresentation(details)) {
      return true;
    }
  }

  return false;
};

export const toTestRecipients = ({
  rows,
  targetedRecipients,
  testEmails,
}: {
  rows: RegistrationRow[];
  targetedRecipients: PendingPptRecipient[];
  testEmails: string[];
}): {
  recipients: PendingPptRecipient[];
  skippedSubmittedTestRecipients: string[];
} => {
  const pendingRecipientByEmail = new Map(
    targetedRecipients.map(
      (recipient) => [recipient.email, recipient] as const,
    ),
  );
  const skippedSubmittedTestRecipients: string[] = [];
  const recipients: PendingPptRecipient[] = [];

  for (const email of testEmails) {
    const pendingRecipient = pendingRecipientByEmail.get(email);
    if (pendingRecipient) {
      recipients.push(pendingRecipient);
      continue;
    }

    if (hasEmailSubmittedPpt({ email, rows })) {
      skippedSubmittedTestRecipients.push(email);
      continue;
    }

    recipients.push({
      email,
      problemStatementTitle: null,
      teamName: null,
    });
  }

  return {
    recipients,
    skippedSubmittedTestRecipients,
  };
};

const getMassMailFromEmail = () => {
  const configuredFromEmail = toTrimmedString(
    process.env.FOUNDATHON_RESEND_FROM_EMAIL,
  );
  return configuredFromEmail ?? DEFAULT_FROM_EMAIL;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getEmailContent = ({
  problemStatementTitle,
  siteUrl,
  teamName,
}: {
  problemStatementTitle: string | null;
  siteUrl: string;
  teamName: string | null;
}) => {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");
  const registerUrl = `${normalizedSiteUrl}/register`;
  const subject =
    "Foundathon 3.0 Urgent Reminder: Submit Your PPT (Submission deadline: 5 March 2026)";
  const displayTeamName = teamName ?? "Foundathon Team";
  const displayProblemStatement =
    problemStatementTitle ?? "Not locked yet (please lock a statement).";
  const escapedTeamName = escapeHtml(displayTeamName);
  const escapedProblemStatement = escapeHtml(displayProblemStatement);

  const text = [
    `Hello ${displayTeamName},`,
    "",
    "You have successfully registered for Foundathon 3.0, but your PPT submission is still pending.",
    `Team Name: ${displayTeamName}`,
    `Problem Statement: ${displayProblemStatement}`,
    "",
    "Please sign in and upload your PPT from your team dashboard as soon as possible.",
    "",
    "URGENT: The last date of Submission is 5th of March 2026.",
    "Please submit your PPT immediately to avoid missing final evaluation.",
    "",
    `Sign in and continue here: ${registerUrl}`,
    "",
    "Regards,",
    "Foundathon Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hello <strong>${escapedTeamName}</strong>,</p>
      <p>
        You have successfully registered for <strong>${EVENT_TITLE}</strong>, but your PPT submission is still pending.
      </p>
      <p>
        <strong>Team Name:</strong> ${escapedTeamName}<br />
        <strong>Problem Statement:</strong> ${escapedProblemStatement}
      </p>
      <p>
        Please sign in and upload your PPT from your team dashboard as soon as possible.
      </p>
      <p style="color: #b91c1c; font-weight: 700;">
        URGENT: The last date of <strong>Submission</strong> is 5th of March 2026.
      </p>
      <p style="color: #dc2626;">
        Please submit your PPT immediately to avoid missing final evaluation.
      </p>
      <p>
        <a href="${registerUrl}" target="_blank" rel="noopener noreferrer">
          Sign in and continue
        </a>
      </p>
      <p>Regards,<br />Foundathon Team</p>
    </div>
  `;

  return {
    html,
    subject,
    text,
  };
};

const fail = (error: string, status: number): SendMissingPptReminderResult => ({
  error,
  ok: false,
  status,
});

export const sendMissingPptReminderMassMail = async ({
  adminEmail,
  mode,
  testEmails,
}: SendMissingPptReminderInput): Promise<SendMissingPptReminderResult> => {
  const normalizedAdminEmail = toNormalizedEmail(adminEmail);
  if (!isEmailLike(normalizedAdminEmail)) {
    return fail(INVALID_EMAIL_ERROR, 400);
  }

  const supabase = getServiceRoleSupabaseClient();
  if (!supabase) {
    return fail("Supabase service role client is not configured.", 500);
  }

  let rows: RegistrationRow[] = [];
  try {
    const { data, error } = await supabase
      .from(REGISTRATION_TABLE)
      .select("registration_email, details")
      .eq("event_id", EVENT_ID);

    if (error) {
      return fail(
        error.message || "Failed to fetch registration emails for mass mail.",
        500,
      );
    }

    rows = (data ?? []) as RegistrationRow[];
  } catch (caughtError) {
    return fail(
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to fetch registration emails for mass mail.",
      500,
    );
  }

  const targetedRecipients = toPendingPptRecipients(rows);
  const normalizedTestEmails =
    mode === "test"
      ? toUniqueNormalizedEmails(
          testEmails?.length ? testEmails : [normalizedAdminEmail],
        )
      : [];
  if (mode === "test" && normalizedTestEmails.length === 0) {
    return fail("Provide at least one valid test email address.", 400);
  }

  const testRecipientsSelection =
    mode === "test"
      ? toTestRecipients({
          rows,
          targetedRecipients,
          testEmails: normalizedTestEmails,
        })
      : {
          recipients: [] as PendingPptRecipient[],
          skippedSubmittedTestRecipients: [] as string[],
        };

  const recipients =
    mode === "test"
      ? testRecipientsSelection.recipients
      : toReminderRecipientsByMode({
          mode,
          normalizedAdminEmail,
          targetedRecipients,
        });
  const skippedSubmittedTestRecipients =
    mode === "test"
      ? testRecipientsSelection.skippedSubmittedTestRecipients
      : [];
  const testSkippedReason =
    mode === "test" &&
    recipients.length === 0 &&
    skippedSubmittedTestRecipients.length === 1
      ? "already_submitted"
      : undefined;

  if (recipients.length === 0) {
    return {
      failedCount: 0,
      mode,
      ok: true,
      recipientCount: 0,
      sentCount: 0,
      skippedSubmittedTestRecipients:
        mode === "test" ? skippedSubmittedTestRecipients : undefined,
      testRecipients: mode === "test" ? normalizedTestEmails : undefined,
      targetedRecipientCount: targetedRecipients.length,
      testRecipient:
        mode === "test"
          ? (normalizedTestEmails[0] ?? normalizedAdminEmail)
          : null,
      ...(testSkippedReason ? { testSkippedReason } : {}),
    };
  }

  const resendApiKey = getFoundathonResendApiKey();
  if (!resendApiKey) {
    return fail(
      "FOUNDATHON_RESEND_API_KEY is not configured for mass mail.",
      500,
    );
  }

  const resend = new Resend(resendApiKey);
  const siteUrl = getFoundathonSiteUrl() ?? DEFAULT_SITE_URL;
  const from = getMassMailFromEmail();

  const results = await Promise.allSettled(
    recipients.map(async (recipient) => {
      const { html, subject, text } = getEmailContent({
        problemStatementTitle: recipient.problemStatementTitle,
        siteUrl,
        teamName: recipient.teamName,
      });
      const { error } = await resend.emails.send({
        from,
        html,
        subject,
        text,
        to: recipient.email,
      });

      if (error) {
        throw new Error(error.message || "Failed to send reminder email.");
      }
    }),
  );

  const sentCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const failedCount = results.length - sentCount;

  return {
    failedCount,
    mode,
    ok: true,
    recipientCount: recipients.length,
    skippedSubmittedTestRecipients:
      mode === "test" ? skippedSubmittedTestRecipients : undefined,
    sentCount,
    testRecipients: mode === "test" ? normalizedTestEmails : undefined,
    targetedRecipientCount: targetedRecipients.length,
    testRecipient:
      mode === "test"
        ? (normalizedTestEmails[0] ?? normalizedAdminEmail)
        : null,
  };
};
