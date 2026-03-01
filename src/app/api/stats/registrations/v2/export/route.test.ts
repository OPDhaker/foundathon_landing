import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsApiKey: vi.fn(),
  getFoundathonStatsPageKey: vi.fn(),
  getRegistrationStatsV2ExportTable: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  getFoundathonStatsApiKey: mocks.getFoundathonStatsApiKey,
  getFoundathonStatsPageKey: mocks.getFoundathonStatsPageKey,
}));

vi.mock("@/server/registration-stats/service-v2", () => ({
  getRegistrationStatsV2ExportTable: mocks.getRegistrationStatsV2ExportTable,
}));

describe("/api/stats/registrations/v2/export GET", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getFoundathonStatsApiKey.mockReset();
    mocks.getFoundathonStatsPageKey.mockReset();
    mocks.getRegistrationStatsV2ExportTable.mockReset();

    mocks.getFoundathonStatsApiKey.mockReturnValue("stats-secret");
    mocks.getFoundathonStatsPageKey.mockReturnValue("page-secret");
    mocks.getRegistrationStatsV2ExportTable.mockResolvedValue({
      data: {
        columns: ["teamName", "pendingDays"],
        limit: 100,
        rows: [{ pendingDays: 5, teamName: "Team B" }],
        sort: "pendingDays desc",
        total: 1,
      },
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
        "http://localhost/api/stats/registrations/v2/export?dataset=intake_workstream",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Stats API key is not configured.");
    expect(mocks.getRegistrationStatsV2ExportTable).not.toHaveBeenCalled();
  });

  it("returns 401 when neither header nor page key is provided", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2/export?dataset=intake_workstream",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mocks.getRegistrationStatsV2ExportTable).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid dataset", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2/export?dataset=bad",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid dataset query parameter.");
    expect(mocks.getRegistrationStatsV2ExportTable).not.toHaveBeenCalled();
  });

  it("returns CSV with attachment headers for API-key auth", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2/export?dataset=review_workstream",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "foundathon-stats-v2-review_workstream-",
    );
    expect(body).toContain("teamName,pendingDays");
    expect(body).toContain("Team B,5");
    expect(mocks.getRegistrationStatsV2ExportTable).toHaveBeenCalledWith({
      dataset: "review_workstream",
      queryInput: {
        approval: "all",
        from: null,
        legacyView: null,
        limit: 100,
        section: "intake",
        statement: "all",
        teamType: "all",
        to: null,
      },
    });
  });

  it("accepts page key query auth and section filters", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2/export?dataset=blockers_data_quality&key=page-secret&section=quality&teamType=unknown",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.getRegistrationStatsV2ExportTable).toHaveBeenCalledWith({
      dataset: "blockers_data_quality",
      queryInput: {
        approval: "all",
        from: null,
        legacyView: null,
        limit: 100,
        section: "quality",
        statement: "all",
        teamType: "unknown",
        to: null,
      },
    });
  });

  it("returns service errors", async () => {
    mocks.getRegistrationStatsV2ExportTable.mockResolvedValue({
      error: "Failed to fetch registrations for stats.",
      ok: false,
      status: 500,
    });

    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/registrations/v2/export?dataset=intake_workstream",
        {
          headers: { "x-foundathon-stats-key": "stats-secret" },
        },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch registrations for stats.");
  });
});
