import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceRoleSupabaseClient: vi.fn(),
}));

vi.mock("@/server/supabase/service-role-client", () => ({
  getServiceRoleSupabaseClient: mocks.getServiceRoleSupabaseClient,
}));

describe("problem statement cap export service", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getServiceRoleSupabaseClient.mockReset();
  });

  it("exports accepted team leads with SRM and non-SRM lead fields plus problem statement columns", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: "2026-03-01T00:00:00.000Z",
          details: {
            lead: {
              contact: 9876543210,
              dept: "CSE",
              name: "Alice Lead",
              netId: "ab1234",
              raNumber: "RA1234567890123",
            },
            members: [
              {
                contact: 9876543211,
                dept: "CSE",
                name: "Member One",
                netId: "ab1235",
                raNumber: "RA1234567890124",
              },
              {
                contact: 9876543212,
                dept: "CSE",
                name: "Member Two",
                netId: "ab1236",
                raNumber: "RA1234567890125",
              },
            ],
            problemStatementId: "ps-01",
            problemStatementTitle: "Smart Campus",
            teamName: "Accepted Alpha",
            teamType: "srm",
          },
          id: "11111111-1111-4111-8111-111111111111",
          is_approved: "ACCEPTED",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
        {
          created_at: "2026-03-02T00:00:00.000Z",
          details: {
            clubName: "",
            collegeName: "External College",
            isClub: false,
            lead: {
              collegeEmail: "lead@college.edu",
              collegeId: "COL-1",
              contact: 9988776655,
              name: "External Lead",
            },
            members: [
              {
                collegeEmail: "m1@college.edu",
                collegeId: "COL-2",
                contact: 9988776656,
                name: "External One",
              },
              {
                collegeEmail: "m2@college.edu",
                collegeId: "COL-3",
                contact: 9988776657,
                name: "External Two",
              },
            ],
            problemStatementId: "ps-02",
            teamName: "Accepted External",
            teamType: "non_srm",
          },
          id: "22222222-2222-4222-8222-222222222222",
          is_approved: "accepted",
          updated_at: "2026-03-02T00:00:00.000Z",
        },
        {
          created_at: "2026-03-03T00:00:00.000Z",
          details: {
            lead: {
              contact: 9988776655,
              dept: "ECE",
              name: "Pending Lead",
              netId: "cd1234",
              raNumber: "RA2234567890123",
            },
            members: [
              {
                contact: 9988776656,
                dept: "ECE",
                name: "Pending One",
                netId: "cd1235",
                raNumber: "RA2234567890124",
              },
              {
                contact: 9988776657,
                dept: "ECE",
                name: "Pending Two",
                netId: "cd1236",
                raNumber: "RA2234567890125",
              },
            ],
            problemStatementId: "ps-03",
            problemStatementTitle: "Pending Statement",
            teamName: "Pending Beta",
            teamType: "srm",
          },
          id: "33333333-3333-4333-8333-333333333333",
          is_approved: "submitted",
          updated_at: "2026-03-03T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order,
      }),
    });

    mocks.getServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select,
      }),
    });

    const { getAdminProblemStatementCapExportTable } = await import(
      "./problem-statement-cap-export"
    );
    const result = await getAdminProblemStatementCapExportTable({
      dataset: "accepted-team-leads",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.columns).toEqual([
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
    ]);
    expect(result.data.rows).toEqual([
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
      {
        "Lead College Email": "lead@college.edu",
        "Lead College ID": "COL-1",
        "Lead Contact": "9988776655",
        "Lead Department": null,
        "Lead Name": "External Lead",
        "Lead RA Number": null,
        "Lead SRM Email": null,
        "Problem Statement Number": "PS-02",
        "Problem Statement Title": null,
        "Team Name": "Accepted External",
        "Team Type": "Non-SRM",
      },
    ]);
    expect(select).toHaveBeenCalledWith("id, created_at, is_approved, details");
  });

  it("includes problem statement columns for accepted SRM participants and skips non-SRM teams", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: "2026-03-01T00:00:00.000Z",
          details: {
            lead: {
              contact: 9876543210,
              dept: "CSE",
              name: "Alice Lead",
              netId: "ab1234",
              raNumber: "RA1234567890123",
            },
            members: [
              {
                contact: 9876543211,
                dept: "CSE",
                name: "Member One",
                netId: "ab1235",
                raNumber: "RA1234567890124",
              },
              {
                contact: 9876543212,
                dept: "ECE",
                name: "Member Two",
                netId: "ab1236",
                raNumber: "RA1234567890125",
              },
            ],
            problemStatementId: "ps-01",
            problemStatementTitle: "Smart Campus",
            teamName: "Accepted Alpha",
            teamType: "srm",
          },
          id: "11111111-1111-4111-8111-111111111111",
          is_approved: "accepted",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
        {
          created_at: "2026-03-02T00:00:00.000Z",
          details: {
            clubName: "",
            collegeName: "External College",
            isClub: false,
            lead: {
              collegeEmail: "lead@college.edu",
              collegeId: "COL-1",
              contact: 9988776655,
              name: "External Lead",
            },
            members: [
              {
                collegeEmail: "m1@college.edu",
                collegeId: "COL-2",
                contact: 9988776656,
                name: "External One",
              },
              {
                collegeEmail: "m2@college.edu",
                collegeId: "COL-3",
                contact: 9988776657,
                name: "External Two",
              },
            ],
            teamName: "Accepted External",
            teamType: "non_srm",
          },
          id: "22222222-2222-4222-8222-222222222222",
          is_approved: "accepted",
          updated_at: "2026-03-02T00:00:00.000Z",
        },
      ],
      error: null,
    });

    mocks.getServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order,
          }),
        }),
      }),
    });

    const { getAdminProblemStatementCapExportTable } = await import(
      "./problem-statement-cap-export"
    );
    const result = await getAdminProblemStatementCapExportTable({
      dataset: "accepted-srm-members",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.columns).toEqual([
      "Team Name",
      "Problem Statement Number",
      "Problem Statement Title",
      "Participant Name",
      "Role",
      "RA Number",
      "Department",
      "SRM Email",
    ]);
    expect(result.data.rows).toEqual([
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
      {
        Department: "CSE",
        "Participant Name": "Member One",
        "Problem Statement Number": "PS-01",
        "Problem Statement Title": "Smart Campus",
        "RA Number": "RA1234567890124",
        Role: "Member",
        "SRM Email": "ab1235@srmist.edu.in",
        "Team Name": "Accepted Alpha",
      },
      {
        Department: "ECE",
        "Participant Name": "Member Two",
        "Problem Statement Number": "PS-01",
        "Problem Statement Title": "Smart Campus",
        "RA Number": "RA1234567890125",
        Role: "Member",
        "SRM Email": "ab1236@srmist.edu.in",
        "Team Name": "Accepted Alpha",
      },
    ]);
  });
});
