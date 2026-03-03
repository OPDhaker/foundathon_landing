"use client";

import { type FormEvent, useState } from "react";
import { FnButton } from "@/components/ui/fn-button";
import { toast } from "@/hooks/use-toast";

type UpdateResponse = {
  cap?: number;
  error?: string;
  registrationsOpen?: boolean;
};

type MassMailResponse = {
  error?: string;
  failedCount?: number;
  mode?: "live" | "test";
  recipientCount?: number;
  skippedSubmittedTestRecipients?: string[];
  sentCount?: number;
  testRecipients?: string[];
  targetedRecipientCount?: number;
  testSkippedReason?: "already_submitted";
  testRecipient?: string | null;
};

type AdminProblemStatementCapClientProps = {
  adminEmail: string;
  initialCap: number;
  initialRegistrationsOpen: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toParsedTestEmails = (value: string) =>
  value
    .split(/[\s,]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

export default function AdminProblemStatementCapClient({
  adminEmail,
  initialCap,
  initialRegistrationsOpen,
}: AdminProblemStatementCapClientProps) {
  const [capInput, setCapInput] = useState(String(initialCap));
  const [currentCap, setCurrentCap] = useState(initialCap);
  const [registrationsOpen, setRegistrationsOpen] = useState(
    initialRegistrationsOpen,
  );
  const [isSavingCap, setIsSavingCap] = useState(false);
  const [isSavingRegistrationsOpen, setIsSavingRegistrationsOpen] =
    useState(false);
  const [useTestMail, setUseTestMail] = useState(true);
  const [testEmailInput, setTestEmailInput] = useState(adminEmail);
  const [isSendingMassMail, setIsSendingMassMail] = useState(false);

  const applySettingsFromResponse = (data: UpdateResponse | null) => {
    if (typeof data?.cap === "number") {
      setCurrentCap(data.cap);
      setCapInput(String(data.cap));
    }

    if (typeof data?.registrationsOpen === "boolean") {
      setRegistrationsOpen(data.registrationsOpen);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = Number.parseInt(capInput.trim(), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast({
        title: "Invalid Cap",
        description: "Cap must be a positive integer.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCap(true);

    try {
      const response = await fetch("/api/admin/problem-statement-cap", {
        body: JSON.stringify({ cap: parsed }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      const data = (await response
        .json()
        .catch(() => null)) as UpdateResponse | null;

      if (!response.ok || typeof data?.cap !== "number") {
        toast({
          title: "Update Failed",
          description:
            data?.error ??
            "Could not update the cap. Verify admin access and try again.",
          variant: "destructive",
        });
        return;
      }

      applySettingsFromResponse(data);

      toast({
        title: "Cap Updated",
        description: `Problem statement cap is now ${data.cap}.`,
      });
    } catch {
      toast({
        title: "Network Error",
        description: "Could not reach the admin API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCap(false);
    }
  };

  const toggleRegistrationsOpen = async () => {
    const nextRegistrationsOpen = !registrationsOpen;
    setIsSavingRegistrationsOpen(true);

    try {
      const response = await fetch("/api/admin/problem-statement-cap", {
        body: JSON.stringify({ registrationsOpen: nextRegistrationsOpen }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      const data = (await response
        .json()
        .catch(() => null)) as UpdateResponse | null;

      if (!response.ok || typeof data?.registrationsOpen !== "boolean") {
        toast({
          title: "Update Failed",
          description:
            data?.error ??
            "Could not update registration status. Verify admin access and try again.",
          variant: "destructive",
        });
        return;
      }

      applySettingsFromResponse(data);

      toast({
        title: data.registrationsOpen
          ? "Registrations Opened"
          : "Registrations Stopped",
        description: data.registrationsOpen
          ? "Users can create and edit registrations again."
          : "Users can no longer create or edit registrations.",
      });
    } catch {
      toast({
        title: "Network Error",
        description: "Could not reach the admin API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRegistrationsOpen(false);
    }
  };

  const sendMissingPptReminderMail = async () => {
    const parsedTestEmails = useTestMail
      ? [...new Set(toParsedTestEmails(testEmailInput))]
      : [];
    if (useTestMail && parsedTestEmails.length === 0) {
      toast({
        title: "Invalid Test Emails",
        description: "Enter at least one valid test email address.",
        variant: "destructive",
      });
      return;
    }

    const invalidTestEmails = parsedTestEmails.filter(
      (email) => !EMAIL_PATTERN.test(email),
    );
    if (useTestMail && invalidTestEmails.length > 0) {
      toast({
        title: "Invalid Test Emails",
        description: `Invalid email: ${invalidTestEmails[0]}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSendingMassMail(true);

    try {
      const response = await fetch("/api/admin/mass-mail", {
        body: JSON.stringify({
          useTestMail,
          ...(useTestMail ? { testEmails: parsedTestEmails } : {}),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response
        .json()
        .catch(() => null)) as MassMailResponse | null;

      if (!response.ok) {
        toast({
          title: "Mail Send Failed",
          description:
            data?.error ??
            "Could not send mass mail. Verify admin access and try again.",
          variant: "destructive",
        });
        return;
      }

      const recipientCount = data?.recipientCount ?? 0;
      const sentCount = data?.sentCount ?? 0;
      const failedCount = data?.failedCount ?? 0;
      const targetedRecipientCount = data?.targetedRecipientCount ?? 0;
      const skippedSubmittedTestRecipients =
        data?.skippedSubmittedTestRecipients ?? [];

      if ((data?.mode ?? (useTestMail ? "test" : "live")) === "test") {
        if (
          data?.testSkippedReason === "already_submitted" ||
          (sentCount === 0 && skippedSubmittedTestRecipients.length > 0)
        ) {
          toast({
            title:
              skippedSubmittedTestRecipients.length > 1
                ? "Test Emails Already Submitted"
                : "Test Email Already Submitted",
            description:
              skippedSubmittedTestRecipients.length > 1
                ? `${skippedSubmittedTestRecipients.length} test emails have already submitted PPT.`
                : `${
                    skippedSubmittedTestRecipients[0] ??
                    data?.testRecipient ??
                    adminEmail
                  } has already submitted PPT.`,
          });
          return;
        }

        toast({
          title:
            failedCount > 0 || skippedSubmittedTestRecipients.length > 0
              ? "Test Mail Partially Sent"
              : "Test Mail Sent",
          description:
            failedCount > 0
              ? `Sent ${sentCount}/${recipientCount} test mail(s).`
              : skippedSubmittedTestRecipients.length > 0
                ? `Sent ${sentCount} test mail(s). Skipped ${skippedSubmittedTestRecipients.length} email(s) with submitted PPT.`
                : `Sent test mail to ${(data?.testRecipients ?? []).join(", ") || data?.testRecipient || adminEmail}.`,
          variant: failedCount > 0 ? "destructive" : undefined,
        });
        return;
      }

      if (recipientCount === 0) {
        toast({
          title: "No Pending Teams",
          description:
            "No registered teams with pending PPT submission were found.",
        });
        return;
      }

      toast({
        title:
          failedCount > 0
            ? "Mass Mail Completed with Errors"
            : "Mass Mail Sent",
        description:
          failedCount > 0
            ? `Sent ${sentCount}/${recipientCount} emails. ${failedCount} failed.`
            : `Sent ${sentCount} reminder email(s) to pending teams (${targetedRecipientCount} targeted).`,
        variant: failedCount > 0 ? "destructive" : undefined,
      });
    } catch {
      toast({
        title: "Network Error",
        description: "Could not reach the admin API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMassMail(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 text-foreground relative overflow-hidden">
      <div className="fncontainer relative py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-b-4 border-fnblue bg-background p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.16em] text-fnblue font-semibold">
            Admin Control
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">
            Registration Controls
          </h1>
          <p className="mt-2 text-sm text-foreground/75">
            Signed in as <span className="font-semibold">{adminEmail}</span>
          </p>

          <div className="mt-6 rounded-xl border border-fnblue/30 bg-fnblue/8 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-fnblue font-semibold">
              Current Cap
            </p>
            <p className="mt-1 text-3xl font-black text-fnblue">{currentCap}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
                New Cap
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-fnblue"
                inputMode="numeric"
                min={1}
                name="cap"
                onChange={(event) => setCapInput(event.target.value)}
                step={1}
                value={capInput}
              />
            </label>

            <FnButton
              type="submit"
              disabled={isSavingCap}
              loading={isSavingCap}
              loadingText="Saving..."
            >
              Update Cap
            </FnButton>
          </form>

          <div
            className={`mt-8 rounded-xl border p-4 ${
              registrationsOpen
                ? "border-fngreen/35 bg-fngreen/10"
                : "border-fnred/35 bg-fnred/10"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.14em] font-semibold ${
                registrationsOpen ? "text-fngreen" : "text-fnred"
              }`}
            >
              Registration Status
            </p>
            <p
              className={`mt-1 text-3xl font-black ${
                registrationsOpen ? "text-fngreen" : "text-fnred"
              }`}
            >
              {registrationsOpen ? "OPEN" : "CLOSED"}
            </p>
            <p className="mt-1 text-sm text-foreground/75">
              {registrationsOpen
                ? "Users can currently create and edit registrations."
                : "Registration actions are currently blocked."}
            </p>
            <FnButton
              className="mt-4"
              tone={registrationsOpen ? "red" : "green"}
              type="button"
              disabled={isSavingRegistrationsOpen}
              loading={isSavingRegistrationsOpen}
              loadingText="Saving..."
              onClick={toggleRegistrationsOpen}
            >
              {registrationsOpen
                ? "Stop Registrations"
                : "Resume Registrations"}
            </FnButton>
          </div>

          <div className="mt-8 rounded-xl border border-fnyellow/35 bg-fnyellow/10 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-fnyellow font-semibold">
              Mass Mail
            </p>
            <h2 className="mt-1 text-lg font-black uppercase tracking-tight">
              Pending PPT Reminder
            </h2>
            <p className="mt-1 text-sm text-foreground/75">
              Sends reminder email to teams who registered but have not
              submitted PPT, including reminder that the last date of
              registration is 5th of March 2026.
            </p>

            <div className="mt-4 rounded-lg border border-foreground/15 bg-background/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/75">
                    Delivery Mode
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {useTestMail ? "Test Mail" : "Live Audience"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useTestMail}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    useTestMail
                      ? "border-fnyellow bg-fnyellow/70"
                      : "border-fnred bg-fnred/70"
                  }`}
                  onClick={() => setUseTestMail((current) => !current)}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-background transition-transform ${
                      useTestMail ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-xs text-foreground/70">
                {useTestMail
                  ? "Test mode sends to custom test email(s) listed below."
                  : "Live mode sends to all registered teams with pending PPT submission."}
              </p>
              {useTestMail ? (
                <label className="mt-3 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/75">
                    Test Emails
                  </span>
                  <textarea
                    className="mt-2 w-full rounded-xl border border-foreground/20 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-fnblue"
                    onChange={(event) => setTestEmailInput(event.target.value)}
                    placeholder={adminEmail}
                    rows={3}
                    value={testEmailInput}
                  />
                  <p className="mt-1 text-[11px] text-foreground/65">
                    Enter comma, space, or newline separated emails.
                  </p>
                </label>
              ) : null}
            </div>

            <FnButton
              className="mt-4"
              tone={useTestMail ? "yellow" : "red"}
              type="button"
              disabled={isSendingMassMail}
              loading={isSendingMassMail}
              loadingText="Sending..."
              onClick={sendMissingPptReminderMail}
            >
              Send PPT Reminder Email
            </FnButton>
          </div>
        </section>
      </div>
    </main>
  );
}
