import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServiceRoleSupabaseClient: vi.fn(),
  sendTeamDecisionMail: vi.fn(),
}));

vi.mock("@/server/supabase/service-role-client", () => ({
  getServiceRoleSupabaseClient: mocks.getServiceRoleSupabaseClient,
}));

vi.mock("@/server/mass-mail/team-decision", () => ({
  sendTeamDecisionMail: mocks.sendTeamDecisionMail,
}));

describe("admin review submissions service", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getServiceRoleSupabaseClient.mockReset();
    mocks.sendTeamDecisionMail.mockReset();
    mocks.sendTeamDecisionMail.mockResolvedValue({
      ok: true,
      recipient: "team@example.com",
    });
  });

  it("lists only submitted teams and returns statement tab counts", async () => {
    const listQuery = {
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              details: {
                lead: { name: "Lead One" },
                presentationFileName: "one.pptx",
                presentationPublicUrl: "https://example.com/one",
                presentationUploadedAt: "2026-03-01T10:00:00.000Z",
                problemStatementId: "ps-01",
                teamName: "Team One",
              },
              id: "11111111-1111-4111-8111-111111111111",
              is_approved: null,
              registration_email: "one@example.com",
            },
            {
              details: {
                lead: { name: "Lead Two" },
                presentationFileName: "two.pptx",
                presentationPublicUrl: "https://example.com/two",
                presentationUploadedAt: "2026-03-02T10:00:00.000Z",
                problemStatementId: "ps-01",
                teamName: "Team Two",
              },
              id: "22222222-2222-4222-8222-222222222222",
              is_approved: "accepted",
              registration_email: "two@example.com",
            },
            {
              details: {
                lead: { name: "Lead Three" },
                presentationFileName: "three.pptx",
                presentationPublicUrl: "https://example.com/three",
                presentationUploadedAt: "2026-03-03T10:00:00.000Z",
                problemStatementId: "ps-02",
                teamName: "Team Three",
              },
              id: "33333333-3333-4333-8333-333333333333",
              is_approved: "rejected",
              registration_email: "three@example.com",
            },
            {
              details: {
                lead: { name: "Lead Four" },
                presentationPublicUrl: "",
                presentationUploadedAt: "",
                teamName: "Pending Team",
              },
              id: "44444444-4444-4444-8444-444444444444",
              is_approved: null,
              registration_email: "four@example.com",
            },
          ],
          error: null,
        }),
      }),
    };

    mocks.getServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(listQuery),
      }),
    });

    const { listAdminReviewSubmissions } = await import("./review-submissions");
    const result = await listAdminReviewSubmissions({ statement: "ps-01" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.teams).toHaveLength(2);
    expect(result.data.teams[0]?.teamName).toBe("Team Two");
    expect(result.data.teams[1]?.teamName).toBe("Team One");

    const allTab = result.data.tabs.find((tab) => tab.id === "all");
    const ps01Tab = result.data.tabs.find((tab) => tab.id === "ps-01");
    const ps02Tab = result.data.tabs.find((tab) => tab.id === "ps-02");

    expect(allTab?.count).toBe(3);
    expect(ps01Tab?.count).toBe(2);
    expect(ps02Tab?.count).toBe(1);
  });

  it("returns 409 when decision target has no submitted PPT", async () => {
    const fetchQuery = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              details: {
                teamName: "No PPT Team",
              },
              id: "11111111-1111-4111-8111-111111111111",
              is_approved: null,
              registration_email: "team@example.com",
            },
            error: null,
          }),
        }),
      }),
    };

    mocks.getServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(fetchQuery),
      }),
    });

    const { updateAdminReviewDecision } = await import("./review-submissions");
    const result = await updateAdminReviewDecision({
      decision: "accepted",
      teamId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.status).toBe(409);
    expect(mocks.sendTeamDecisionMail).not.toHaveBeenCalled();
  });

  it("updates decision and returns success when mail sends", async () => {
    const fetchQuery = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              details: {
                presentationPublicUrl: "https://example.com/ppt",
                presentationUploadedAt: "2026-03-01T10:00:00.000Z",
                problemStatementTitle: "PS",
                teamName: "Team One",
              },
              id: "11111111-1111-4111-8111-111111111111",
              is_approved: null,
              registration_email: "team@example.com",
            },
            error: null,
          }),
        }),
      }),
    };

    const updateQuery = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                details: {
                  presentationPublicUrl: "https://example.com/ppt",
                  presentationUploadedAt: "2026-03-01T10:00:00.000Z",
                  problemStatementTitle: "PS",
                  teamName: "Team One",
                },
                id: "11111111-1111-4111-8111-111111111111",
                is_approved: "accepted",
                registration_email: "team@example.com",
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    const update = vi.fn().mockReturnValue(updateQuery);

    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(fetchQuery),
      })
      .mockReturnValueOnce({
        update,
      });

    mocks.getServiceRoleSupabaseClient.mockReturnValue({ from });
    mocks.sendTeamDecisionMail.mockResolvedValueOnce({
      ok: true,
      recipient: "team@example.com",
    });

    const { updateAdminReviewDecision } = await import("./review-submissions");
    const result = await updateAdminReviewDecision({
      decision: "accepted",
      teamId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.approvalStatus).toBe("accepted");
    expect(update).toHaveBeenCalledWith({ is_approved: "ACCEPTED" });
    expect(result.data.mail).toEqual({
      recipient: "team@example.com",
      sent: true,
    });
  });

  it("keeps decision and returns warning when mail fails", async () => {
    const fetchQuery = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              details: {
                presentationPublicUrl: "https://example.com/ppt",
                presentationUploadedAt: "2026-03-01T10:00:00.000Z",
                problemStatementTitle: "PS",
                teamName: "Team One",
              },
              id: "11111111-1111-4111-8111-111111111111",
              is_approved: null,
              registration_email: "team@example.com",
            },
            error: null,
          }),
        }),
      }),
    };

    const updateQuery = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                details: {
                  presentationPublicUrl: "https://example.com/ppt",
                  presentationUploadedAt: "2026-03-01T10:00:00.000Z",
                  problemStatementTitle: "PS",
                  teamName: "Team One",
                },
                id: "11111111-1111-4111-8111-111111111111",
                is_approved: "rejected",
                registration_email: "team@example.com",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const from = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(fetchQuery),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue(updateQuery),
      });

    mocks.getServiceRoleSupabaseClient.mockReturnValue({ from });
    mocks.sendTeamDecisionMail.mockResolvedValueOnce({
      error: "provider down",
      ok: false,
      recipient: "team@example.com",
      status: 502,
    });

    const { updateAdminReviewDecision } = await import("./review-submissions");
    const result = await updateAdminReviewDecision({
      decision: "rejected",
      teamId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.approvalStatus).toBe("rejected");
    expect(result.data.mail.sent).toBe(false);
    expect(result.data.mail.error).toContain("provider down");
  });
});
