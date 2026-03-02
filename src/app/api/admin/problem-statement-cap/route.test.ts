import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceSameOrigin: vi.fn(),
  getProblemStatementCap: vi.fn(),
  getRouteAuthContext: vi.fn(),
  isFoundathonAdminEmail: vi.fn(),
  updateProblemStatementCap: vi.fn(),
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

vi.mock("@/server/problem-statements/cap-settings", () => ({
  getProblemStatementCap: mocks.getProblemStatementCap,
  updateProblemStatementCap: mocks.updateProblemStatementCap,
}));

describe("/api/admin/problem-statement-cap", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.enforceSameOrigin.mockReset();
    mocks.getProblemStatementCap.mockReset();
    mocks.getRouteAuthContext.mockReset();
    mocks.isFoundathonAdminEmail.mockReset();
    mocks.updateProblemStatementCap.mockReset();

    mocks.enforceSameOrigin.mockReturnValue(null);
    mocks.getProblemStatementCap.mockResolvedValue(15);
    mocks.isFoundathonAdminEmail.mockReturnValue(true);
    mocks.getRouteAuthContext.mockResolvedValue({
      ok: true,
      supabase: {},
      user: { email: "admin@example.com", id: "user-1" },
    });
    mocks.updateProblemStatementCap.mockResolvedValue({
      cap: 20,
      ok: true,
    });
  });

  it("GET forwards unauthenticated responses", async () => {
    mocks.getRouteAuthContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("GET returns 403 for non-admin users", async () => {
    mocks.isFoundathonAdminEmail.mockReturnValueOnce(false);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("GET returns current cap for admin users", async () => {
    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cap).toBe(15);
  });

  it("PATCH rejects non-json payloads", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/admin/problem-statement-cap",
      {
        body: "cap=20",
        headers: { "content-type": "text/plain" },
        method: "PATCH",
      },
    );

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error).toMatch(/content-type/i);
  });

  it("PATCH validates payload cap values", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/admin/problem-statement-cap",
      {
        body: JSON.stringify({ cap: 0 }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/positive integer/i);
  });

  it("PATCH updates cap for admin users", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest(
      "http://localhost/api/admin/problem-statement-cap",
      {
        body: JSON.stringify({ cap: 25 }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    const response = await PATCH(request);
    const body = await response.json();

    expect(mocks.updateProblemStatementCap).toHaveBeenCalledWith(25);
    expect(response.status).toBe(200);
    expect(body.cap).toBe(20);
  });
});
