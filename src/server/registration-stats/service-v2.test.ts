import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROBLEM_STATEMENTS } from "@/data/problem-statements";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsExcludedEmails: vi.fn(),
  getServiceRoleSupabaseClient: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  getFoundathonStatsExcludedEmails: mocks.getFoundathonStatsExcludedEmails,
}));

vi.mock("@/server/supabase/service-role-client", () => ({
  getServiceRoleSupabaseClient: mocks.getServiceRoleSupabaseClient,
}));

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

const createSupabaseClientMock = (result: QueryResult) => {
  const eqByEventId = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq: eqByEventId });
  const from = vi.fn().mockReturnValue({ select });

  return { from };
};

describe("registration stats v2 service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T00:00:00.000Z"));

    vi.resetModules();
    mocks.getFoundathonStatsExcludedEmails.mockReset();
    mocks.getServiceRoleSupabaseClient.mockReset();

    mocks.getFoundathonStatsExcludedEmails.mockReturnValue([
      "opdhaker2007@gmail.com",
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 500 when service role client is unavailable", async () => {
    mocks.getServiceRoleSupabaseClient.mockReturnValue(null);
    const { getRegistrationStatsV2 } = await import("./service-v2");

    const result = await getRegistrationStatsV2();

    expect(result).toEqual({
      error: "Stats service role client is not configured.",
      ok: false,
      status: 500,
    });
  });

  it("computes summary, workstreams, and blocker tables", async () => {
    const ps01 = PROBLEM_STATEMENTS[0];
    if (!ps01) {
      throw new Error("Expected problem statement seed data for tests.");
    }

    const supabase = createSupabaseClientMock({
      data: [
        {
          created_at: "2026-03-09T08:00:00.000Z",
          details: {
            lead: { name: "Lead A" },
            members: [{ name: "M1" }, { name: "M2" }],
            presentationFileName: "a.pptx",
            presentationFileSizeBytes: 1234,
            presentationMimeType:
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            presentationPublicUrl: "https://example.com/a",
            presentationStoragePath: "presentations/a.pptx",
            presentationUploadedAt: "2026-03-09T10:00:00.000Z",
            problemStatementId: ps01.id,
            teamName: "Team A",
            teamType: "srm",
          },
          id: "team-a",
          is_approved: "accepted",
          registration_email: "team-a@example.com",
        },
        {
          created_at: "2026-03-05T08:00:00.000Z",
          details: {
            lead: { name: "Lead B" },
            members: [{ name: "M1" }],
            problemStatementId: ps01.id,
            teamName: "Team B",
            teamType: "non_srm",
          },
          id: "team-b",
          is_approved: "not_reviewed",
          registration_email: "team-b@example.com",
        },
        {
          created_at: "2026-03-08T08:00:00.000Z",
          details: {
            lead: { name: "Lead C" },
            members: "invalid-members",
            presentationPublicUrl: "https://example.com/c",
            teamName: "Team C",
            teamType: "other",
          },
          id: "team-c",
          is_approved: "not_reviewed",
          registration_email: "team-c@example.com",
        },
        {
          created_at: "invalid-date",
          details: {
            teamName: "Team D",
          },
          id: "team-d",
          is_approved: "not_reviewed",
          registration_email: "team-d@example.com",
        },
        {
          created_at: "2026-03-09T08:00:00.000Z",
          details: {
            lead: { name: "Excluded" },
            members: [{ name: "M1" }],
            problemStatementId: ps01.id,
            teamName: "Excluded Team",
            teamType: "srm",
          },
          id: "team-excluded",
          is_approved: "accepted",
          registration_email: " OPDHAKER2007@GMAIL.COM ",
        },
      ],
      error: null,
    });

    mocks.getServiceRoleSupabaseClient.mockReturnValue(supabase);

    const { getRegistrationStatsV2, getRegistrationStatsV2ExportTable } =
      await import("./service-v2");

    const result = await getRegistrationStatsV2();
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.filters.excludedRows).toBe(1);
    expect(result.data.meta.totalRowsBeforeFilters).toBe(4);
    expect(result.data.meta.totalRowsAfterFilters).toBe(4);

    expect(result.data.summary).toEqual([
      { id: "pendingReview", label: "Pending Review", unit: "teams", value: 3 },
      {
        id: "oldestPendingDays",
        label: "Oldest Pending",
        unit: "days",
        value: 4,
      },
      {
        id: "pendingSubmissions",
        label: "Pending Submissions",
        unit: "teams",
        value: 2,
      },
      { id: "anomalyRate", label: "Anomaly Rate", unit: "percent", value: 50 },
    ]);

    expect(result.data.sections.review.cards).toEqual(
      expect.arrayContaining([
        {
          id: "submittedButNotReviewed",
          label: "Submitted But Not Reviewed",
          unit: "teams",
          value: 1,
        },
      ]),
    );

    expect(result.data.sections.intake.table.rows[0]).toMatchObject({
      teamName: "Team A",
    });
    expect(result.data.sections.intake.cards).toEqual(
      expect.arrayContaining([
        {
          id: "peakHourlyRegistrations",
          label: "Peak Hourly Registrations",
          unit: "teams",
          value: 1,
        },
        {
          id: "peakHourWindow",
          label: "Peak Hour Window (IST)",
          unit: "window",
          value: "05 Mar, 1:00 pm",
        },
        {
          id: "busiestHourOfDay",
          label: "Busiest Hour Of Day",
          unit: "hour",
          value: "1 pm (3 regs, 75%)",
        },
      ]),
    );
    const intakeHourlyChart = result.data.sections.intake.charts.find(
      (chart) => chart.id === "intake-hourly-registrations",
    );
    expect(intakeHourlyChart?.labels).toEqual([
      "2026-03-05 13:00",
      "2026-03-08 13:00",
      "2026-03-09 13:00",
    ]);
    expect(intakeHourlyChart?.series[0]?.data).toEqual([1, 1, 1]);
    expect(intakeHourlyChart?.xAxisLabelMode).toBe("hour_bucket");
    expect(intakeHourlyChart?.tooltipLabelMode).toBe("hour_bucket");
    const intakeHourOfDayChart = result.data.sections.intake.charts.find(
      (chart) => chart.id === "intake-hour-of-day-distribution",
    );
    expect(intakeHourOfDayChart?.labels[0]).toBe("00");
    expect(intakeHourOfDayChart?.labels[23]).toBe("23");
    expect(intakeHourOfDayChart?.series[0]?.data[13]).toBe(3);
    expect(intakeHourOfDayChart?.xAxisLabelMode).toBe("hour_of_day");
    expect(intakeHourOfDayChart?.tooltipLabelMode).toBe("hour_of_day");

    expect(result.data.sections.review.table.rows[0]).toMatchObject({
      pendingDays: "Unknown",
      teamName: "Team D",
    });

    expect(result.data.sections.quality.table.rows[0]).toMatchObject({
      teamName: "Team C",
    });

    expect(result.data.sections.intake.table.columns).not.toContain(
      "registration_email",
    );
    expect(result.data.sections.intake.table.rows[0]).not.toHaveProperty(
      "registration_email",
    );

    const reviewOverdue = await getRegistrationStatsV2ExportTable({
      dataset: "blockers_review_overdue",
    });
    expect(reviewOverdue.ok).toBe(true);
    if (!reviewOverdue.ok) {
      return;
    }

    expect(reviewOverdue.data.rows).toHaveLength(2);
    expect(reviewOverdue.data.rows[0]).toMatchObject({
      pendingDays: "Unknown",
      teamName: "Team D",
    });
    expect(reviewOverdue.data.rows[1]).toMatchObject({
      pendingDays: 4,
      teamName: "Team B",
    });

    const pendingSubmissions = await getRegistrationStatsV2ExportTable({
      dataset: "blockers_pending_submission",
    });
    expect(pendingSubmissions.ok).toBe(true);
    if (!pendingSubmissions.ok) {
      return;
    }

    expect(pendingSubmissions.data.rows[0]).toMatchObject({
      teamName: "Team B",
    });
    expect(pendingSubmissions.data.rows[1]).toMatchObject({
      teamName: "Team D",
    });
  });

  it("respects approval filters in section and summary metrics", async () => {
    const ps01 = PROBLEM_STATEMENTS[0];
    if (!ps01) {
      throw new Error("Expected problem statement seed data for tests.");
    }

    const supabase = createSupabaseClientMock({
      data: [
        {
          created_at: "2026-03-09T08:00:00.000Z",
          details: {
            lead: { name: "Lead A" },
            members: [{ name: "M1" }],
            problemStatementId: ps01.id,
            teamName: "Team A",
            teamType: "srm",
          },
          id: "team-a",
          is_approved: "accepted",
          registration_email: "team-a@example.com",
        },
        {
          created_at: "2026-03-08T08:00:00.000Z",
          details: {
            lead: { name: "Lead B" },
            members: [{ name: "M1" }],
            problemStatementId: ps01.id,
            teamName: "Team B",
            teamType: "srm",
          },
          id: "team-b",
          is_approved: "not_reviewed",
          registration_email: "team-b@example.com",
        },
      ],
      error: null,
    });

    mocks.getServiceRoleSupabaseClient.mockReturnValue(supabase);

    const { getRegistrationStatsV2 } = await import("./service-v2");

    const result = await getRegistrationStatsV2({
      approval: "accepted",
      section: "review",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.meta.activeSection).toBe("review");
    expect(result.data.meta.totalRowsAfterFilters).toBe(1);
    expect(result.data.summary[0]).toEqual({
      id: "pendingReview",
      label: "Pending Review",
      unit: "teams",
      value: 0,
    });
    expect(result.data.sections.review.table.total).toBe(0);
    expect(result.data.sections.intake.table.total).toBe(1);
  });
});
