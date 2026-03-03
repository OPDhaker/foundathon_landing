import { describe, expect, it } from "vitest";
import {
  hasEmailSubmittedPpt,
  toPendingPptRecipientEmails,
  toPendingPptRecipients,
  toReminderRecipientsByMode,
  toTestRecipients,
} from "@/server/mass-mail/ppt-reminder";

describe("toPendingPptRecipientEmails", () => {
  it("returns unique normalized emails for teams without submitted PPT", () => {
    const recipients = toPendingPptRecipientEmails([
      {
        details: {},
        registration_email: "Team@One.com",
      },
      {
        details: {},
        registration_email: " team@one.com ",
      },
      {
        details: {
          presentationPublicUrl: "https://example.com/slide",
          presentationUploadedAt: "2026-03-01T10:00:00.000Z",
        },
        registration_email: "submitted@example.com",
      },
      {
        details: {},
        registration_email: "not-an-email",
      },
    ]);

    expect(recipients).toEqual(["team@one.com"]);
  });

  it("includes emails when PPT metadata is incomplete", () => {
    const recipients = toPendingPptRecipientEmails([
      {
        details: {
          presentationUploadedAt: "2026-03-01T10:00:00.000Z",
        },
        registration_email: "missing-public-url@example.com",
      },
      {
        details: {
          presentationPublicUrl: "https://example.com/slide",
        },
        registration_email: "missing-uploaded-at@example.com",
      },
    ]);

    expect(recipients).toEqual([
      "missing-public-url@example.com",
      "missing-uploaded-at@example.com",
    ]);
  });

  it("handles unexpected details shapes safely", () => {
    const recipients = toPendingPptRecipientEmails([
      {
        details: null,
        registration_email: "one@example.com",
      },
      {
        details: "invalid",
        registration_email: "two@example.com",
      },
      {
        details: ["bad"],
        registration_email: "three@example.com",
      },
    ]);

    expect(recipients).toEqual([
      "one@example.com",
      "two@example.com",
      "three@example.com",
    ]);
  });
});

describe("toPendingPptRecipients", () => {
  it("includes team name and stored problem statement title for pending rows", () => {
    const recipients = toPendingPptRecipients([
      {
        details: {
          problemStatementTitle: "Custom Problem Statement",
          teamName: "Pitch Panthers",
        },
        registration_email: "team@example.com",
      },
    ]);

    expect(recipients).toEqual([
      {
        email: "team@example.com",
        problemStatementTitle: "Custom Problem Statement",
        teamName: "Pitch Panthers",
      },
    ]);
  });

  it("falls back to problem statement seed title from problemStatementId", () => {
    const recipients = toPendingPptRecipients([
      {
        details: {
          problemStatementId: "ps-01",
          teamName: "Board Breakers",
        },
        registration_email: "board-breakers@example.com",
      },
    ]);

    expect(recipients).toEqual([
      {
        email: "board-breakers@example.com",
        problemStatementTitle: "Localized Government Scheme Discovery Portal",
        teamName: "Board Breakers",
      },
    ]);
  });

  it("merges duplicate recipients to preserve first non-empty metadata", () => {
    const recipients = toPendingPptRecipients([
      {
        details: {},
        registration_email: "team@example.com",
      },
      {
        details: {
          problemStatementTitle: "Problem A",
        },
        registration_email: "team@example.com",
      },
      {
        details: {
          teamName: "Team A",
        },
        registration_email: "team@example.com",
      },
    ]);

    expect(recipients).toEqual([
      {
        email: "team@example.com",
        problemStatementTitle: "Problem A",
        teamName: "Team A",
      },
    ]);
  });
});

describe("toReminderRecipientsByMode", () => {
  it("returns all targeted recipients in live mode", () => {
    const recipients = toReminderRecipientsByMode({
      mode: "live",
      normalizedAdminEmail: "admin@example.com",
      targetedRecipients: [
        {
          email: "one@example.com",
          problemStatementTitle: "Problem One",
          teamName: "Team One",
        },
        {
          email: "two@example.com",
          problemStatementTitle: "Problem Two",
          teamName: "Team Two",
        },
      ],
    });

    expect(recipients).toEqual([
      {
        email: "one@example.com",
        problemStatementTitle: "Problem One",
        teamName: "Team One",
      },
      {
        email: "two@example.com",
        problemStatementTitle: "Problem Two",
        teamName: "Team Two",
      },
    ]);
  });

  it("uses admin-specific metadata in test mode when admin has pending row", () => {
    const recipients = toReminderRecipientsByMode({
      mode: "test",
      normalizedAdminEmail: "admin@example.com",
      targetedRecipients: [
        {
          email: "team@example.com",
          problemStatementTitle: "Problem One",
          teamName: "Team One",
        },
        {
          email: "admin@example.com",
          problemStatementTitle: "Admin Problem",
          teamName: "Admin Team",
        },
      ],
    });

    expect(recipients).toEqual([
      {
        email: "admin@example.com",
        problemStatementTitle: "Admin Problem",
        teamName: "Admin Team",
      },
    ]);
  });

  it("falls back to generic metadata in test mode when admin has no pending row", () => {
    const recipients = toReminderRecipientsByMode({
      mode: "test",
      normalizedAdminEmail: "admin@example.com",
      targetedRecipients: [
        {
          email: "team@example.com",
          problemStatementTitle: "Problem One",
          teamName: "Team One",
        },
      ],
    });

    expect(recipients).toEqual([
      {
        email: "admin@example.com",
        problemStatementTitle: null,
        teamName: null,
      },
    ]);
  });
});

describe("hasEmailSubmittedPpt", () => {
  it("returns true when matching email has submitted PPT metadata", () => {
    const submitted = hasEmailSubmittedPpt({
      email: "admin@example.com",
      rows: [
        {
          details: {
            presentationPublicUrl: "https://example.com/slide",
            presentationUploadedAt: "2026-03-01T10:00:00.000Z",
          },
          registration_email: "admin@example.com",
        },
      ],
    });

    expect(submitted).toBe(true);
  });

  it("returns false when matching email has only pending metadata", () => {
    const submitted = hasEmailSubmittedPpt({
      email: "admin@example.com",
      rows: [
        {
          details: {
            presentationUploadedAt: "2026-03-01T10:00:00.000Z",
          },
          registration_email: "admin@example.com",
        },
      ],
    });

    expect(submitted).toBe(false);
  });

  it("returns false when email does not match any row", () => {
    const submitted = hasEmailSubmittedPpt({
      email: "admin@example.com",
      rows: [
        {
          details: {
            presentationPublicUrl: "https://example.com/slide",
            presentationUploadedAt: "2026-03-01T10:00:00.000Z",
          },
          registration_email: "team@example.com",
        },
      ],
    });

    expect(submitted).toBe(false);
  });
});

describe("toTestRecipients", () => {
  it("uses pending team metadata when test email is pending", () => {
    const selected = toTestRecipients({
      rows: [
        {
          details: {
            problemStatementTitle: "Problem One",
            teamName: "Team One",
          },
          registration_email: "team@example.com",
        },
      ],
      targetedRecipients: [
        {
          email: "team@example.com",
          problemStatementTitle: "Problem One",
          teamName: "Team One",
        },
      ],
      testEmails: ["team@example.com"],
    });

    expect(selected).toEqual({
      recipients: [
        {
          email: "team@example.com",
          problemStatementTitle: "Problem One",
          teamName: "Team One",
        },
      ],
      skippedSubmittedTestRecipients: [],
    });
  });

  it("skips test email when that email already submitted PPT", () => {
    const selected = toTestRecipients({
      rows: [
        {
          details: {
            presentationPublicUrl: "https://example.com/slide",
            presentationUploadedAt: "2026-03-01T10:00:00.000Z",
          },
          registration_email: "submitted@example.com",
        },
      ],
      targetedRecipients: [],
      testEmails: ["submitted@example.com"],
    });

    expect(selected).toEqual({
      recipients: [],
      skippedSubmittedTestRecipients: ["submitted@example.com"],
    });
  });

  it("uses generic metadata for external custom test emails", () => {
    const selected = toTestRecipients({
      rows: [],
      targetedRecipients: [],
      testEmails: ["external@example.com"],
    });

    expect(selected).toEqual({
      recipients: [
        {
          email: "external@example.com",
          problemStatementTitle: null,
          teamName: null,
        },
      ],
      skippedSubmittedTestRecipients: [],
    });
  });
});
