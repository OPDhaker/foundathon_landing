import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsApiKey: vi.fn(),
  getFoundathonStatsPageKey: vi.fn(),
  getRegistrationStats: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  getFoundathonStatsApiKey: mocks.getFoundathonStatsApiKey,
  getFoundathonStatsPageKey: mocks.getFoundathonStatsPageKey,
}));

vi.mock("@/server/registration-stats/service", () => ({
  getRegistrationStats: mocks.getRegistrationStats,
}));

const buildServicePayload = () => {
  const sharedView = {
    cards: [],
    charts: [],
    table: {
      columns: ["dataset", "value"],
      limit: 100,
      rows: [{ dataset: "registrations", value: 5 }],
      sort: "value desc",
      total: 1,
    },
  };

  return {
    views: {
      approvals: sharedView,
      exports: sharedView,
      institutions: sharedView,
      overview: sharedView,
      quality: sharedView,
      registrations: {
        ...sharedView,
        table: {
          columns: ["date", "registrations"],
          limit: 100,
          rows: [{ date: "2026-02-28", registrations: 2 }],
          sort: "registrations desc",
          total: 1,
        },
      },
      statements: sharedView,
      submissions: sharedView,
    },
  };
};

describe("/api/stats/registrations/export GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getFoundathonStatsApiKey.mockReset();
    mocks.getFoundathonStatsPageKey.mockReset();
    mocks.getRegistrationStats.mockReset();

    mocks.getFoundathonStatsApiKey.mockReturnValue("stats-secret");
    mocks.getFoundathonStatsPageKey.mockReturnValue("page-secret");
    mocks.getRegistrationStats.mockResolvedValue({
      data: buildServicePayload(),
      ok: true,
      status: 200,
    });
  });

  it("returns 500 when no keys are configured", async () => {
    mocks.getFoundathonStatsApiKey.mockReturnValue(null);
    mocks.getFoundathonStatsPageKey.mockReturnValue(null);
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=registrations",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Stats API key is not configured.");
    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("returns 401 when neither header nor page key is provided", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=registrations",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid dataset", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=bad",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid dataset query parameter.");
    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("returns CSV with attachment headers for API-key auth", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=registrations",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "foundathon-stats-registrations-",
    );
    expect(body).toContain("date,registrations");
    expect(body).toContain("2026-02-28,2");
    expect(mocks.getRegistrationStats).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      limit: 100,
      statement: "all",
      teamType: "all",
      to: null,
      view: "registrations",
    });
  });

  it("accepts page key query auth for UI downloads", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=registrations&key=page-secret&teamType=srm",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.getRegistrationStats).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      limit: 100,
      statement: "all",
      teamType: "srm",
      to: null,
      view: "registrations",
    });
  });

  it("supports overview dataset export", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/export?dataset=overview",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain(
      "foundathon-stats-overview-",
    );
    expect(mocks.getRegistrationStats).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      limit: 100,
      statement: "all",
      teamType: "all",
      to: null,
      view: "overview",
    });
  });
});
