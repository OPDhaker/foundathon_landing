import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsApiKey: vi.fn(),
  getRegistrationStatsV2: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  getFoundathonStatsApiKey: mocks.getFoundathonStatsApiKey,
}));

vi.mock("@/server/registration-stats/service-v2", () => ({
  getRegistrationStatsV2: mocks.getRegistrationStatsV2,
}));

describe("/api/stats/registrations/v2 GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getFoundathonStatsApiKey.mockReset();
    mocks.getRegistrationStatsV2.mockReset();

    mocks.getFoundathonStatsApiKey.mockReturnValue("stats-secret");
    mocks.getRegistrationStatsV2.mockResolvedValue({
      data: {
        generatedAt: "2026-03-01T00:00:00.000Z",
        meta: {
          activeSection: "intake",
          registrationTrendTimezone: "Asia/Kolkata",
        },
      },
      ok: true,
      status: 200,
    });
  });

  it("returns 500 when stats API key is not configured", async () => {
    mocks.getFoundathonStatsApiKey.mockReturnValue(null);
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/stats/registrations/v2"),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Stats API key is not configured.");
    expect(mocks.getRegistrationStatsV2).not.toHaveBeenCalled();
  });

  it("returns 401 when header is missing", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/stats/registrations/v2"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mocks.getRegistrationStatsV2).not.toHaveBeenCalled();
  });

  it("returns 401 when header is invalid", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/stats/registrations/v2", {
        headers: { "x-foundathon-stats-key": "wrong-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mocks.getRegistrationStatsV2).not.toHaveBeenCalled();
  });

  it("returns 200 with no-store header on success", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/stats/registrations/v2", {
        headers: { "x-foundathon-stats-key": "stats-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.generatedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(mocks.getRegistrationStatsV2).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      legacyView: null,
      limit: 20,
      section: "intake",
      statement: "all",
      teamType: "all",
      to: null,
    });
  });

  it("maps legacy view and normalizes filters", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2?view=submissions&teamType=srm&approval=accepted&limit=400&from=2026-03-02&to=2026-03-01",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.getRegistrationStatsV2).toHaveBeenCalledWith({
      approval: "accepted",
      from: "2026-03-01",
      legacyView: "submissions",
      limit: 100,
      section: "review",
      statement: "all",
      teamType: "srm",
      to: "2026-03-02",
    });
  });

  it("returns service errors", async () => {
    mocks.getRegistrationStatsV2.mockResolvedValue({
      error: "Failed to fetch registrations for stats.",
      ok: false,
      status: 500,
    });
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost/api/stats/registrations/v2", {
        headers: { "x-foundathon-stats-key": "stats-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch registrations for stats.");
  });
});
