import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceSameOrigin: vi.fn(),
  getRouteAuthContext: vi.fn(),
  hasAdminReviewAccess: vi.fn(),
  updateAdminReviewDecision: vi.fn(),
}));

vi.mock("@/server/security/csrf", () => ({
  enforceSameOrigin: mocks.enforceSameOrigin,
}));

vi.mock("@/server/auth/context", () => ({
  getRouteAuthContext: mocks.getRouteAuthContext,
}));

vi.mock("@/server/admin/review-access", () => ({
  hasAdminReviewAccess: mocks.hasAdminReviewAccess,
}));

vi.mock("@/server/admin/review-submissions", () => ({
  updateAdminReviewDecision: mocks.updateAdminReviewDecision,
}));

const makeParams = (teamId: string) => ({
  params: Promise.resolve({ teamId }),
});

describe("/api/admin/review-submissions/[teamId] PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.enforceSameOrigin.mockReset();
    mocks.getRouteAuthContext.mockReset();
    mocks.hasAdminReviewAccess.mockReset();
    mocks.updateAdminReviewDecision.mockReset();

    mocks.enforceSameOrigin.mockReturnValue(null);
    mocks.getRouteAuthContext.mockResolvedValue({
      ok: true,
      supabase: {},
      user: { email: "admin@example.com", id: "user-1" },
    });
    mocks.hasAdminReviewAccess.mockResolvedValue(true);
    mocks.updateAdminReviewDecision.mockResolvedValue({
      data: {
        approvalStatus: "accepted",
        mail: { recipient: "team@example.com", sent: true },
        teamId: "11111111-1111-4111-8111-111111111111",
      },
      ok: true,
      status: 200,
    });
  });

  it("returns CSRF response when same-origin check fails", async () => {
    mocks.enforceSameOrigin.mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { "content-type": "application/json" },
        status: 403,
      }),
    );

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "accepted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );

    expect(response.status).toBe(403);
    expect(mocks.updateAdminReviewDecision).not.toHaveBeenCalled();
  });

  it("forwards unauthenticated auth context response", async () => {
    mocks.getRouteAuthContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "accepted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );

    expect(response.status).toBe(401);
    expect(mocks.updateAdminReviewDecision).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin user", async () => {
    mocks.hasAdminReviewAccess.mockResolvedValueOnce(false);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "accepted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("rejects invalid team id path params", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/review-submissions/bad-id", {
        body: JSON.stringify({ decision: "accepted" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }),
      makeParams("bad-id"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
  });

  it("rejects non-json requests", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: "decision=accepted",
          headers: { "content-type": "text/plain" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error).toMatch(/content-type/i);
  });

  it("validates payload shape", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "submitted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
    expect(mocks.updateAdminReviewDecision).not.toHaveBeenCalled();
  });

  it("returns service response on success", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "accepted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.updateAdminReviewDecision).toHaveBeenCalledWith({
      decision: "accepted",
      teamId: "11111111-1111-4111-8111-111111111111",
    });
    expect(body.approvalStatus).toBe("accepted");
  });

  it("forwards service failures", async () => {
    mocks.updateAdminReviewDecision.mockResolvedValueOnce({
      error: "Team has not submitted PPT yet.",
      ok: false,
      status: 409,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/review-submissions/11111111-1111-4111-8111-111111111111",
        {
          body: JSON.stringify({ decision: "accepted" }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      ),
      makeParams("11111111-1111-4111-8111-111111111111"),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("submitted PPT");
  });
});
