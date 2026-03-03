import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceSameOrigin: vi.fn(),
  getRouteAuthContext: vi.fn(),
  isFoundathonAdminEmail: vi.fn(),
  sendMissingPptReminderMassMail: vi.fn(),
}));

vi.mock("@/server/security/csrf", () => ({
  enforceSameOrigin: mocks.enforceSameOrigin,
}));

vi.mock("@/server/auth/context", () => ({
  getRouteAuthContext: mocks.getRouteAuthContext,
}));

vi.mock("@/server/env", () => ({
  isFoundathonAdminEmail: mocks.isFoundathonAdminEmail,
}));

vi.mock("@/server/mass-mail/ppt-reminder", () => ({
  sendMissingPptReminderMassMail: mocks.sendMissingPptReminderMassMail,
}));

describe("/api/admin/mass-mail POST", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.enforceSameOrigin.mockReset();
    mocks.getRouteAuthContext.mockReset();
    mocks.isFoundathonAdminEmail.mockReset();
    mocks.sendMissingPptReminderMassMail.mockReset();

    mocks.enforceSameOrigin.mockReturnValue(null);
    mocks.isFoundathonAdminEmail.mockReturnValue(true);
    mocks.getRouteAuthContext.mockResolvedValue({
      ok: true,
      supabase: {},
      user: { email: "admin@example.com", id: "user-1" },
    });
    mocks.sendMissingPptReminderMassMail.mockResolvedValue({
      failedCount: 0,
      mode: "test",
      ok: true,
      recipientCount: 1,
      sentCount: 1,
      targetedRecipientCount: 10,
      testRecipient: "admin@example.com",
    });
  });

  it("returns unauthenticated response from auth context", async () => {
    mocks.getRouteAuthContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({ useTestMail: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.sendMissingPptReminderMassMail).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    mocks.isFoundathonAdminEmail.mockReturnValueOnce(false);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({ useTestMail: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(mocks.sendMissingPptReminderMassMail).not.toHaveBeenCalled();
  });

  it("rejects non-json payloads", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: "useTestMail=true",
        headers: { "content-type": "text/plain" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error).toMatch(/content-type/i);
  });

  it("validates payload", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({ useTestMail: "true" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
    expect(mocks.sendMissingPptReminderMassMail).not.toHaveBeenCalled();
  });

  it("calls service in test mode and returns summary", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({ useTestMail: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendMissingPptReminderMassMail).toHaveBeenCalledWith({
      adminEmail: "admin@example.com",
      mode: "test",
    });
    expect(body.mode).toBe("test");
    expect(body.sentCount).toBe(1);
  });

  it("forwards custom test emails in test mode", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({
          testEmails: ["first@example.com", "second@example.com"],
          useTestMail: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendMissingPptReminderMassMail).toHaveBeenCalledWith({
      adminEmail: "admin@example.com",
      mode: "test",
      testEmails: ["first@example.com", "second@example.com"],
    });
    expect(body.mode).toBe("test");
  });

  it("rejects invalid custom test emails", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({
          testEmails: ["not-an-email"],
          useTestMail: true,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/email/i);
    expect(mocks.sendMissingPptReminderMassMail).not.toHaveBeenCalled();
  });

  it("forwards service failures", async () => {
    mocks.sendMissingPptReminderMassMail.mockResolvedValueOnce({
      error: "FOUNDATHON_RESEND_API_KEY is not configured for mass mail.",
      ok: false,
      status: 500,
    });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/mass-mail", {
        body: JSON.stringify({ useTestMail: false }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(mocks.sendMissingPptReminderMassMail).toHaveBeenCalledWith({
      adminEmail: "admin@example.com",
      mode: "live",
    });
    expect(response.status).toBe(500);
    expect(body.error).toContain("FOUNDATHON_RESEND_API_KEY");
  });
});
