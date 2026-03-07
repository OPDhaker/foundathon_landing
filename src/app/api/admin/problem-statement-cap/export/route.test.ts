import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminProblemStatementCapExportTable: vi.fn(),
  getRouteAuthContext: vi.fn(),
  isFoundathonAdminEmail: vi.fn(),
}));

vi.mock("@/server/auth/context", () => ({
  getRouteAuthContext: mocks.getRouteAuthContext,
}));

vi.mock("@/server/env", () => ({
  isFoundathonAdminEmail: mocks.isFoundathonAdminEmail,
}));

vi.mock("@/server/admin/problem-statement-cap-export", () => ({
  ADMIN_PROBLEM_STATEMENT_CAP_EXPORT_DATASETS: [
    "accepted-team-leads",
    "accepted-srm-members",
  ],
  getAdminProblemStatementCapExportTable:
    mocks.getAdminProblemStatementCapExportTable,
}));

describe("/api/admin/problem-statement-cap/export", () => {
  beforeEach(() => {
    vi.resetModules();

    mocks.getAdminProblemStatementCapExportTable.mockReset();
    mocks.getRouteAuthContext.mockReset();
    mocks.isFoundathonAdminEmail.mockReset();

    mocks.getRouteAuthContext.mockResolvedValue({
      ok: true,
      supabase: {},
      user: { email: "admin@example.com", id: "user-1" },
    });
    mocks.isFoundathonAdminEmail.mockReturnValue(true);
  });

  it("forwards unauthenticated responses", async () => {
    mocks.getRouteAuthContext.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/problem-statement-cap/export?dataset=accepted-team-leads",
      ),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mocks.isFoundathonAdminEmail.mockReturnValueOnce(false);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/problem-statement-cap/export?dataset=accepted-team-leads",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid dataset values", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/problem-statement-cap/export?dataset=invalid-dataset",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid dataset/i);
    expect(mocks.getAdminProblemStatementCapExportTable).not.toHaveBeenCalled();
  });

  it("returns accepted team leads csv with download headers", async () => {
    mocks.getAdminProblemStatementCapExportTable.mockResolvedValueOnce({
      data: {
        columns: [
          "Team Name",
          "Team Type",
          "Problem Statement Number",
          "Problem Statement Title",
          "Lead Name",
          "Lead Contact",
          "Lead Department",
          "Lead RA Number",
          "Lead SRM Email",
          "Lead College ID",
          "Lead College Email",
        ],
        rows: [
          {
            "Lead College Email": null,
            "Lead College ID": null,
            "Lead Contact": "9876543210",
            "Lead Department": "CSE",
            "Lead Name": "Alice Lead",
            "Lead RA Number": "RA1234567890123",
            "Lead SRM Email": "ab1234@srmist.edu.in",
            "Problem Statement Number": "PS-01",
            "Problem Statement Title": "Smart Campus",
            "Team Name": "Accepted Alpha",
            "Team Type": "SRM",
          },
        ],
      },
      ok: true,
      status: 200,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/problem-statement-cap/export?dataset=accepted-team-leads",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")?.startsWith("text/csv")).toBe(
      true,
    );
    expect(response.headers.get("content-disposition")).toContain(
      "accepted-team-leads",
    );
    expect(body).toBe(
      "Team Name,Team Type,Problem Statement Number,Problem Statement Title,Lead Name,Lead Contact,Lead Department,Lead RA Number,Lead SRM Email,Lead College ID,Lead College Email\nAccepted Alpha,SRM,PS-01,Smart Campus,Alice Lead,9876543210,CSE,RA1234567890123,ab1234@srmist.edu.in,,",
    );
    expect(mocks.getAdminProblemStatementCapExportTable).toHaveBeenCalledWith({
      dataset: "accepted-team-leads",
    });
  });

  it("returns accepted SRM members csv with download headers", async () => {
    mocks.getAdminProblemStatementCapExportTable.mockResolvedValueOnce({
      data: {
        columns: [
          "Team Name",
          "Problem Statement Number",
          "Problem Statement Title",
          "Participant Name",
          "Role",
          "RA Number",
          "Department",
          "SRM Email",
        ],
        rows: [
          {
            Department: "CSE",
            "Participant Name": "Alice Lead",
            "Problem Statement Number": "PS-01",
            "Problem Statement Title": "Smart Campus",
            "RA Number": "RA1234567890123",
            Role: "Lead",
            "SRM Email": "ab1234@srmist.edu.in",
            "Team Name": "Accepted Alpha",
          },
        ],
      },
      ok: true,
      status: 200,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/problem-statement-cap/export?dataset=accepted-srm-members",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")?.startsWith("text/csv")).toBe(
      true,
    );
    expect(response.headers.get("content-disposition")).toContain(
      "accepted-srm-members",
    );
    expect(body).toBe(
      "Team Name,Problem Statement Number,Problem Statement Title,Participant Name,Role,RA Number,Department,SRM Email\nAccepted Alpha,PS-01,Smart Campus,Alice Lead,Lead,RA1234567890123,CSE,ab1234@srmist.edu.in",
    );
    expect(mocks.getAdminProblemStatementCapExportTable).toHaveBeenCalledWith({
      dataset: "accepted-srm-members",
    });
  });
});
