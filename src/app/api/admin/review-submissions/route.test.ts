import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRouteAuthContext: vi.fn(),
  hasAdminReviewAccess: vi.fn(),
  listAdminReviewSubmissions: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  getRouteAuthContext: mocks.getRouteAuthContext,
}));

vi.mock("@/server/admin/review-access", () => ({
  hasAdminReviewAccess: mocks.hasAdminReviewAccess,
}));

vi.mock("@/server/admin/review-submissions", () => ({
  listAdminReviewSubmissions: mocks.listAdminReviewSubmissions,
}));

describe("/api/admin/review-submissions GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getRouteAuthContext.mockReset();
    mocks.hasAdminReviewAccess.mockReset();
    mocks.listAdminReviewSubmissions.mockReset();

    mocks.getRouteAuthContext.mockResolvedValue({
      ok: true,
      supabase: {},
      user: { email: "admin@example.com", id: "user-1" },
    });
    mocks.hasAdminReviewAccess.mockResolvedValue(true);
    mocks.listAdminReviewSubmissions.mockResolvedValue({
      data: {
        statement: "all",
        tabs: [{ count: 1, id: "all", label: "All" }],
        teams: [
          {
            approvalStatus: "submitted",
            id: "11111111-1111-4111-8111-111111111111",
            leadName: "Lead",
            presentationFileName: "deck.pptx",
            presentationPublicUrl: "https://example.com/deck",
            presentationUploadedAt: "2026-03-01T10:00:00.000Z",
            problemStatementId: "ps-01",
            problemStatementTitle: "Problem",
            registrationEmail: "team@example.com",
            teamName: "Team A",
          },
        ],
      },
      ok: true,
      status: 200,
    });
  });

  it("forwards unauthenticated auth response", async () => {
    mocks.getRouteAuthContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/review-submissions"),
    );

    expect(response.status).toBe(401);
    expect(mocks.listAdminReviewSubmissions).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin users", async () => {
    mocks.hasAdminReviewAccess.mockResolvedValueOnce(false);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/review-submissions"),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(mocks.listAdminReviewSubmissions).not.toHaveBeenCalled();
  });

  it("rejects invalid statement query params", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/review-submissions?statement=bad-statement",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid statement/i);
    expect(mocks.listAdminReviewSubmissions).not.toHaveBeenCalled();
  });

  it("returns filtered submissions for valid statement", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/review-submissions?statement=ps-01",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.listAdminReviewSubmissions).toHaveBeenCalledWith({
      statement: "ps-01",
    });
    expect(body.teams).toHaveLength(1);
  });

  it("forwards service failures", async () => {
    mocks.listAdminReviewSubmissions.mockResolvedValueOnce({
      error: "Failed to load submitted teams.",
      ok: false,
      status: 500,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/review-submissions"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("Failed to load");
  });
});
