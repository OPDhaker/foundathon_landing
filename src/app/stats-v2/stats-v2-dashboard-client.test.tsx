import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RegistrationStatsV2Response } from "@/server/registration-stats/service-v2";
import StatsV2DashboardClient from "./stats-v2-dashboard-client";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ height: 320, width: 960 }}>{children}</div>
    ),
  };
});

const buildSectionPayload = () => ({
  cards: [
    { id: "metric-1", label: "Metric 1", unit: "teams", value: 2 },
    { id: "metric-2", label: "Metric 2", unit: "percent", value: 50 },
    { id: "metric-3", label: "Metric 3", unit: "teams", value: 1 },
    { id: "metric-4", label: "Metric 4", unit: "teams", value: 0 },
    {
      id: "peak-hour-window",
      label: "Peak Hour Window (IST)",
      unit: "window",
      value: "01 Mar, 2:00 pm",
    },
    {
      id: "busiest-hour",
      label: "Busiest Hour Of Day",
      unit: "hour",
      value: "2 pm (1 regs, 50%)",
    },
  ],
  charts: [
    {
      chartType: "composed" as const,
      id: "trend",
      label: "Daily + Cumulative Registrations",
      labels: ["2026-03-01", "2026-03-02"],
      tooltipLabelMode: "date" as const,
      xAxisLabelMode: "date" as const,
      series: [
        { data: [1, 1], key: "daily", label: "Daily" },
        { data: [1, 2], key: "cumulative", label: "Cumulative" },
      ],
    },
    {
      chartType: "line" as const,
      id: "hourly-trend",
      label: "Hourly Registrations (IST)",
      labels: ["2026-03-01 14:00", "2026-03-02 15:00"],
      tooltipLabelMode: "hour_bucket" as const,
      xAxisLabelMode: "hour_bucket" as const,
      series: [{ data: [1, 1], key: "hourly", label: "Hourly" }],
    },
    {
      chartType: "bar" as const,
      id: "hour-distribution",
      label: "Registrations by Hour of Day (IST)",
      labels: Array.from({ length: 24 }, (_, index) =>
        String(index).padStart(2, "0"),
      ),
      tooltipLabelMode: "hour_of_day" as const,
      xAxisLabelMode: "hour_of_day" as const,
      series: [
        {
          data: Array.from({ length: 24 }, (_, index) =>
            index === 14 || index === 15 ? 1 : 0,
          ),
          key: "hourlyDistribution",
          label: "Registrations",
        },
      ],
    },
  ],
  table: {
    columns: [
      "teamName",
      "leadName",
      "teamType",
      "statement",
      "createdAt",
      "approvalStatus",
      "submissionStatus",
    ],
    limit: 20,
    rows: [
      {
        approvalStatus: "accepted",
        createdAt: "2026-03-02T10:00:00.000Z",
        leadName: "Lead One",
        statement: "Statement A",
        submissionStatus: "submitted",
        teamName: "Team One",
        teamType: "srm",
      },
      {
        approvalStatus: "not_reviewed",
        createdAt: "2026-03-01T09:00:00.000Z",
        leadName: "Lead Two",
        statement: "Statement B",
        submissionStatus: "pending",
        teamName: "Team Two",
        teamType: "non_srm",
      },
    ],
    sort: "createdAt desc",
    total: 2,
  },
});

const buildStatsPayload = (): RegistrationStatsV2Response => {
  const shared = buildSectionPayload();

  return {
    event: {
      eventId: "325b1472-4ce9-412f-8a5e-e4b7153064fa",
      eventTitle: "Foundathon 3.0",
      statementCap: 15,
      totalCapacity: 150,
      totalStatements: 10,
    },
    exports: {
      datasets: [
        {
          description: "All intake rows",
          id: "intake_workstream",
          label: "Intake Workstream",
          rowCount: 2,
          section: "intake",
        },
        {
          description: "All review rows",
          id: "review_workstream",
          label: "Review Workstream",
          rowCount: 1,
          section: "review",
        },
        {
          description: "All quality rows",
          id: "quality_workstream",
          label: "Quality Workstream",
          rowCount: 1,
          section: "quality",
        },
      ],
    },
    filters: {
      excludedRegistrationEmails: ["opdhaker2007@gmail.com"],
      excludedRows: 0,
      includedRows: 2,
    },
    generatedAt: "2026-03-01T12:00:00.000Z",
    meta: {
      activeSection: "review",
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
    sections: {
      intake: shared,
      quality: shared,
      review: {
        ...shared,
        table: {
          columns: [
            "teamName",
            "leadName",
            "teamType",
            "statement",
            "createdAt",
            "pendingDays",
            "submissionStatus",
          ],
          limit: 20,
          rows: [
            {
              createdAt: "2026-03-01T09:00:00.000Z",
              leadName: "Lead Two",
              pendingDays: 2,
              statement: "Statement B",
              submissionStatus: "pending",
              teamName: "Team Two",
              teamType: "non_srm",
            },
          ],
          sort: "pendingDays desc, createdAt asc",
          total: 1,
        },
      },
    },
    summary: [
      { id: "pendingReview", label: "Pending Review", unit: "teams", value: 1 },
      {
        id: "oldestPendingDays",
        label: "Oldest Pending",
        unit: "days",
        value: 2,
      },
      {
        id: "pendingSubmissions",
        label: "Pending Submissions",
        unit: "teams",
        value: 1,
      },
      { id: "anomalyRate", label: "Anomaly Rate", unit: "percent", value: 0 },
    ],
  };
};

describe("stats v2 dashboard client", () => {
  it("renders summary, filters, section navigation, and workstreams", () => {
    render(
      <StatsV2DashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload()}
        statsKey="page-secret"
      />,
    );

    expect(screen.getByText(/Ops Command Center/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /private stats suite/i }),
    ).toHaveAttribute("href", expect.stringContaining("/stats?"));
    expect(
      screen.getByRole("link", { name: /ops command centre/i }),
    ).toHaveAttribute("href", expect.stringContaining("/stats-v2?"));
    expect(screen.getByText(/^Pending Review$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /apply filters/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /^Intake$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Review$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^Quality$/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: /Intake Workstream/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Review Workstream/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Quality Workstream/i }),
    ).toBeInTheDocument();
  });

  it("renders export links with v2 export endpoint", () => {
    render(
      <StatsV2DashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload()}
        statsKey="page-secret"
      />,
    );

    const intakeExport = screen.getByRole("link", {
      name: /Intake Workstream \(2\)/i,
    });
    expect(intakeExport).toHaveAttribute(
      "href",
      expect.stringContaining("/api/stats/registrations/v2/export?"),
    );
    expect(intakeExport).toHaveAttribute(
      "href",
      expect.stringContaining("dataset=intake_workstream"),
    );
    expect(intakeExport).toHaveAttribute(
      "href",
      expect.stringContaining("key=page-secret"),
    );
  });

  it("supports table search and chart metric toggles", async () => {
    const user = userEvent.setup();

    render(
      <StatsV2DashboardClient
        generatedAtLabel="Mar 1, 2026, 12:00 PM"
        stats={buildStatsPayload()}
        statsKey="page-secret"
      />,
    );

    const intakeSection = document.getElementById("section-intake");
    if (!intakeSection) {
      throw new Error("Expected intake section to render");
    }

    await user.type(
      within(intakeSection).getByPlaceholderText(/search any column value/i),
      "Team Two",
    );

    expect(
      within(intakeSection).getByText(/Showing 1 of 1 matched rows/i),
    ).toBeInTheDocument();

    await user.click(
      within(intakeSection).getByRole("button", { name: /daily/i }),
    );

    expect(
      within(intakeSection).getByRole("button", { name: /show all/i }),
    ).toBeInTheDocument();
  });
});
