import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RegistrationStatsResponse } from "@/server/registration-stats/service";
import StatsDashboardClient from "./stats-dashboard-client";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: unknown }) => (
      <div style={{ height: 320, width: 960 }}>{children}</div>
    ),
  };
});

const buildViewPayload = ({
  chartLabels = ["2026-02-28", "2026-03-01"],
  emptyTrend = false,
}: {
  chartLabels?: string[];
  emptyTrend?: boolean;
} = {}) => ({
  cards: [
    { id: "teams", label: "Total Teams", unit: "teams", value: 2 },
    {
      id: "avg",
      label: "Average Daily Registrations",
      unit: "teams",
      value: 1,
    },
    { id: "peak", label: "Peak Daily Registrations", unit: "teams", value: 1 },
    {
      id: "peak-hourly",
      label: "Peak Hourly Registrations",
      unit: "teams",
      value: 1,
    },
    {
      id: "peak-hour-window",
      label: "Peak Hour Window (IST)",
      unit: "window",
      value: "28 Feb, 3:00 pm",
    },
    {
      id: "busiest-hour",
      label: "Busiest Hour Of Day",
      unit: "hour",
      value: "3 pm (1 regs, 50%)",
    },
    { id: "size", label: "Average Team Size", unit: "members", value: 4 },
  ],
  charts: [
    {
      chartType: "composed" as const,
      id: "registrations-daily-cumulative",
      label: "Daily + Cumulative Registrations",
      labels: chartLabels,
      tooltipLabelMode: "date" as const,
      xAxisLabelMode: "date" as const,
      series: [
        { data: chartLabels.map(() => 1), key: "daily", label: "Daily" },
        {
          data: chartLabels.map((_, index) => index + 1),
          key: "cumulative",
          label: "Cumulative",
        },
      ],
    },
    {
      chartType: "line" as const,
      id: "registrations-hourly-trend",
      label: "Hourly Registration Trend (IST)",
      labels: emptyTrend ? [] : ["2026-02-28 15:00", "2026-03-01 09:00"],
      tooltipLabelMode: "hour_bucket" as const,
      xAxisLabelMode: "hour_bucket" as const,
      series: [
        {
          data: emptyTrend ? [] : [1, 1],
          key: "hourly",
          label: "Hourly",
        },
      ],
    },
    {
      chartType: "bar" as const,
      id: "registrations-hour-of-day-distribution",
      label: "Registrations by Hour of Day (IST)",
      labels: Array.from({ length: 24 }, (_, index) =>
        String(index).padStart(2, "0"),
      ),
      tooltipLabelMode: "hour_of_day" as const,
      xAxisLabelMode: "hour_of_day" as const,
      series: [
        {
          data: Array.from({ length: 24 }, (_, index) =>
            index === 9 || index === 15 ? 1 : 0,
          ),
          key: "hourlyDistribution",
          label: "Registrations",
        },
      ],
    },
    {
      chartType: "donut" as const,
      id: "registrations-team-type",
      label: "Team Type Split",
      labels: ["srm", "non_srm", "unknown"],
      series: [{ data: [2, 0, 0], key: "teams", label: "Teams" }],
    },
  ],
  table: {
    columns: ["date", "registrations", "cumulative"],
    limit: 20,
    rows: chartLabels.map((date, index) => ({
      cumulative: index + 1,
      date,
      registrations: 1,
    })),
    sort: "registrations desc, date desc",
    total: chartLabels.length,
  },
});

const buildStatsPayload = ({
  emptyTrend = false,
}: {
  emptyTrend?: boolean;
} = {}): RegistrationStatsResponse => {
  const registrationsPayload = buildViewPayload({
    chartLabels: emptyTrend ? [] : undefined,
    emptyTrend,
  });
  const sharedViewPayload = buildViewPayload();

  return {
    additionalStats: {
      anomalies: {
        missingOrInvalidTeamMembers: 0,
        missingOrInvalidTeamType: 0,
        missingProblemStatementId: 0,
        unknownProblemStatementId: 0,
      },
      approvalStatusBreakdown: [
        { percent: 50, status: "accepted", teams: 1 },
        { percent: 50, status: "not_reviewed", teams: 1 },
        { percent: 0, status: "rejected", teams: 0 },
        { percent: 0, status: "submitted", teams: 0 },
        { percent: 0, status: "invalid", teams: 0 },
      ],
      firstRegistrationAt: "2026-02-28T10:00:00.000Z",
      lastRegistrationAt: "2026-02-28T12:00:00.000Z",
      participation: {
        averageTeamSize: 4,
        totalParticipants: 8,
      },
      presentationSubmission: {
        pendingTeams: 1,
        submissionRatePercent: 50,
        submittedTeams: 1,
      },
      registrationTrendByDate: emptyTrend
        ? []
        : [
            { date: "2026-02-28", registrations: 1 },
            { date: "2026-03-01", registrations: 1 },
          ],
      registrationTrendByHour: emptyTrend
        ? []
        : [
            { hour: "2026-02-28 15:00", registrations: 1 },
            { hour: "2026-03-01 09:00", registrations: 1 },
          ],
      registrationByHourOfDay: Array.from({ length: 24 }, (_, index) => ({
        hour: String(index).padStart(2, "0"),
        registrations: index === 9 || index === 15 ? 1 : 0,
        sharePercent: index === 9 || index === 15 ? 50 : 0,
      })),
      peakHourBucket: emptyTrend ? null : "2026-02-28 15:00",
      peakHourCount: emptyTrend ? 0 : 1,
      busiestHourOfDay: emptyTrend ? null : "09",
      busiestHourSharePercent: emptyTrend ? 0 : 50,
      registrationTrendTimezone: "Asia/Kolkata",
      teamTypeBreakdown: [
        { percent: 100, teamType: "srm", teams: 2 },
        { percent: 0, teamType: "non_srm", teams: 0 },
        { percent: 0, teamType: "unknown", teams: 0 },
      ],
    },
    event: {
      eventId: "325b1472-4ce9-412f-8a5e-e4b7153064fa",
      eventTitle: "Foundathon 3.0",
      statementCap: 15,
      totalCapacity: 150,
      totalStatements: 10,
    },
    filters: {
      excludedRegistrationEmails: ["opdhaker2007@gmail.com"],
      excludedRows: 0,
      includedRows: 2,
    },
    generatedAt: "2026-03-01T12:00:00.000Z",
    meta: {
      activeView: "registrations",
      appliedFilters: {
        approval: "all",
        from: null,
        limit: 20,
        statement: "all",
        teamType: "all",
        to: null,
      },
      generatedAt: "2026-03-01T12:00:00.000Z",
      registrationTrendTimezone: "Asia/Kolkata",
      statementOptions: [
        {
          id: "ps-01",
          title: "Localized Government Scheme Discovery Portal",
        },
      ],
      totalRowsAfterFilters: 2,
      totalRowsBeforeFilters: 2,
    },
    requiredStats: {
      rateOfFilling: {
        capacityTeams: 150,
        filledTeams: 2,
        overallPercent: 1.33,
        remainingTeams: 148,
      },
      registrationsPerProblemStatement: [
        {
          cap: 15,
          fillRatePercent: 13.33,
          isFull: false,
          problemStatementId: "ps-01",
          registeredTeams: 2,
          remainingTeams: 13,
          title: "Localized Government Scheme Discovery Portal",
        },
      ],
      totalTeamsRegistered: 2,
    },
    views: {
      approvals: sharedViewPayload,
      exports: sharedViewPayload,
      institutions: sharedViewPayload,
      overview: sharedViewPayload,
      quality: sharedViewPayload,
      registrations: registrationsPayload,
      statements: sharedViewPayload,
      submissions: sharedViewPayload,
    },
    visualData: {
      cards: [
        {
          id: "totalTeamsRegistered",
          label: "Total Teams Registered",
          unit: "teams",
          value: 2,
        },
        {
          id: "overallFillRate",
          label: "Overall Fill Rate",
          unit: "percent",
          value: 1.33,
        },
        {
          id: "totalParticipants",
          label: "Total Participants",
          unit: "participants",
          value: 8,
        },
        {
          id: "avgTeamSize",
          label: "Average Team Size",
          unit: "members_per_team",
          value: 4,
        },
        {
          id: "pptSubmissionRate",
          label: "PPT Submission Rate",
          unit: "percent",
          value: 50,
        },
      ],
      charts: {
        approvalStatusDistribution: {
          chartType: "donut",
          labels: [
            "accepted",
            "not_reviewed",
            "rejected",
            "submitted",
            "invalid",
          ],
          series: [{ data: [1, 1, 0, 0, 0], name: "Teams" }],
        },
        fillRatePerProblemStatement: {
          chartType: "bar",
          labels: ["Localized Government Scheme Discovery Portal"],
          series: [{ data: [13.33], name: "Fill Rate %" }],
        },
        registrationTrendByDate: {
          chartType: "line",
          labels: emptyTrend ? [] : ["2026-02-28", "2026-03-01"],
          series: [{ data: emptyTrend ? [] : [1, 1], name: "Registrations" }],
        },
        registrationsPerProblemStatement: {
          chartType: "bar",
          labels: ["Localized Government Scheme Discovery Portal"],
          series: [
            { data: [2], name: "Registrations" },
            { data: [15], name: "Capacity" },
          ],
        },
        teamTypeDistribution: {
          chartType: "donut",
          labels: ["srm", "non_srm", "unknown"],
          series: [{ data: [2, 0, 0], name: "Teams" }],
        },
      },
    },
  };
};

describe("stats dashboard client", () => {
  it("renders routed tabs, filters, and registration section content", () => {
    render(
      <StatsDashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload()}
        statsKey="page-secret"
      />,
    );

    expect(
      screen.getByText(/Unified Registration Analytics/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /private stats suite/i }),
    ).toHaveAttribute("href", expect.stringContaining("/stats?"));
    expect(
      screen.getByRole("link", { name: /ops command centre/i }),
    ).toHaveAttribute("href", expect.stringContaining("/stats-v2?"));
    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /apply filters/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /registrations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Daily \+ Cumulative Registrations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Top Rows/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /export this view/i }),
    ).toHaveAttribute("href", expect.stringContaining("dataset=registrations"));
  });

  it("renders chart empty state when trend labels are unavailable", () => {
    render(
      <StatsDashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload({ emptyTrend: true })}
        statsKey="page-secret"
      />,
    );

    expect(screen.getAllByText(/No chart data available yet\./i).length).toBe(
      2,
    );
  });

  it("supports table search and chart metric toggles", async () => {
    const user = userEvent.setup();

    render(
      <StatsDashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload()}
        statsKey="page-secret"
      />,
    );

    await user.type(
      screen.getByPlaceholderText(/search any column value/i),
      "2026-03-01",
    );

    expect(
      screen.getByText(/Showing 1 of 1 matched rows/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /daily/i }));

    expect(
      screen.getByRole("button", { name: /show all/i }),
    ).toBeInTheDocument();
  });
});
