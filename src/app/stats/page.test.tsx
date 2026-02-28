import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrationStatsResponse } from "@/server/registration-stats/service";
import StatsPage from "./page";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsPageKey: vi.fn(),
  getRegistrationStats: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/server/env", () => ({
  getFoundathonStatsPageKey: mocks.getFoundathonStatsPageKey,
}));

vi.mock("@/server/registration-stats/service", () => ({
  getRegistrationStats: mocks.getRegistrationStats,
}));

vi.mock("./stats-dashboard-client", () => ({
  default: ({
    generatedAtLabel,
    stats,
    statsKey,
  }: {
    generatedAtLabel: string;
    stats: RegistrationStatsResponse;
    statsKey: string;
  }) => (
    <div data-testid="stats-dashboard-client">
      <p>Unified Registration Analytics</p>
      <p>Active View: {stats.meta.activeView}</p>
      <p>Stats Key: {statsKey}</p>
      <p>Generated (UTC): {generatedAtLabel}</p>
    </div>
  ),
}));

const buildStatsPayload = (): RegistrationStatsResponse => ({
  additionalStats: {
    anomalies: {
      missingOrInvalidTeamMembers: 0,
      missingOrInvalidTeamType: 0,
      missingProblemStatementId: 0,
      unknownProblemStatementId: 0,
    },
    approvalStatusBreakdown: [
      { percent: 100, status: "accepted", teams: 1 },
      { percent: 0, status: "rejected", teams: 0 },
      { percent: 0, status: "submitted", teams: 0 },
      { percent: 0, status: "invalid", teams: 0 },
      { percent: 0, status: "not_reviewed", teams: 0 },
    ],
    firstRegistrationAt: "2026-02-28T10:00:00.000Z",
    lastRegistrationAt: "2026-02-28T10:00:00.000Z",
    participation: {
      averageTeamSize: 4,
      totalParticipants: 4,
    },
    presentationSubmission: {
      pendingTeams: 0,
      submissionRatePercent: 100,
      submittedTeams: 1,
    },
    registrationTrendTimezone: "Asia/Kolkata",
    registrationTrendByDate: [{ date: "2026-02-28", registrations: 1 }],
    teamTypeBreakdown: [
      { percent: 100, teamType: "srm", teams: 1 },
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
    includedRows: 1,
  },
  generatedAt: "2026-02-28T12:00:00.000Z",
  meta: {
    activeView: "overview",
    appliedFilters: {
      approval: "all",
      from: null,
      limit: 20,
      statement: "all",
      teamType: "all",
      to: null,
    },
    generatedAt: "2026-02-28T12:00:00.000Z",
    registrationTrendTimezone: "Asia/Kolkata",
    statementOptions: [
      {
        id: "ps-01",
        title: "Localized Government Scheme Discovery Portal",
      },
    ],
    totalRowsAfterFilters: 1,
    totalRowsBeforeFilters: 1,
  },
  requiredStats: {
    rateOfFilling: {
      capacityTeams: 150,
      filledTeams: 1,
      overallPercent: 0.67,
      remainingTeams: 149,
    },
    registrationsPerProblemStatement: [
      {
        cap: 15,
        fillRatePercent: 6.67,
        isFull: false,
        problemStatementId: "ps-01",
        registeredTeams: 1,
        remainingTeams: 14,
        title: "Localized Government Scheme Discovery Portal",
      },
    ],
    totalTeamsRegistered: 1,
  },
  views: {
    approvals: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    exports: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    institutions: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    overview: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    quality: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    registrations: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    statements: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
    submissions: {
      cards: [{ id: "a", label: "A", unit: "teams", value: 1 }],
      charts: [],
      table: {
        columns: ["name"],
        limit: 20,
        rows: [{ name: "row" }],
        sort: "name asc",
        total: 1,
      },
    },
  },
  visualData: {
    cards: [
      {
        id: "totalTeamsRegistered",
        label: "Total Teams Registered",
        unit: "teams",
        value: 1,
      },
      {
        id: "overallFillRate",
        label: "Overall Fill Rate",
        unit: "percent",
        value: 0.67,
      },
      {
        id: "totalParticipants",
        label: "Total Participants",
        unit: "participants",
        value: 4,
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
        value: 100,
      },
    ],
    charts: {
      approvalStatusDistribution: {
        chartType: "donut",
        labels: [
          "accepted",
          "rejected",
          "submitted",
          "invalid",
          "not_reviewed",
        ],
        series: [{ data: [1, 0, 0, 0, 0], name: "Teams" }],
      },
      fillRatePerProblemStatement: {
        chartType: "bar",
        labels: ["Localized Government Scheme Discovery Portal"],
        series: [{ data: [6.67], name: "Fill Rate %" }],
      },
      registrationTrendByDate: {
        chartType: "line",
        labels: ["2026-02-28"],
        series: [{ data: [1], name: "Registrations" }],
      },
      registrationsPerProblemStatement: {
        chartType: "bar",
        labels: ["Localized Government Scheme Discovery Portal"],
        series: [
          { data: [1], name: "Registrations" },
          { data: [15], name: "Capacity" },
        ],
      },
      teamTypeDistribution: {
        chartType: "donut",
        labels: ["srm", "non_srm", "unknown"],
        series: [{ data: [1, 0, 0], name: "Teams" }],
      },
    },
  },
});

describe("/stats page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFoundathonStatsPageKey.mockReturnValue("page-secret");
    mocks.getRegistrationStats.mockResolvedValue({
      data: buildStatsPayload(),
      ok: true,
      status: 200,
    });
  });

  it("calls notFound when query key is missing", async () => {
    await expect(
      StatsPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("calls notFound when query key is invalid", async () => {
    await expect(
      StatsPage({
        searchParams: Promise.resolve({ key: "wrong-key" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("calls notFound when stats page key env is missing", async () => {
    mocks.getFoundathonStatsPageKey.mockReturnValue(null);

    await expect(
      StatsPage({
        searchParams: Promise.resolve({ key: "page-secret" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.getRegistrationStats).not.toHaveBeenCalled();
  });

  it("renders stats content when key is valid", async () => {
    const page = await StatsPage({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });

    render(page);

    expect(
      screen.getByText(/unified registration analytics/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/active view: overview/i)).toBeInTheDocument();
    expect(screen.getByTestId("stats-dashboard-client")).toBeInTheDocument();
  });

  it("accepts trimmed stats page key from env", async () => {
    mocks.getFoundathonStatsPageKey.mockReturnValue("  page-secret  ");

    const page = await StatsPage({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });

    render(page);

    expect(
      screen.getByText(/unified registration analytics/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/stats key: page-secret/i)).toBeInTheDocument();
    expect(mocks.getRegistrationStats).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      limit: 20,
      statement: "all",
      teamType: "all",
      to: null,
      view: "overview",
    });
  });

  it("normalizes invalid view to overview before fetching stats", async () => {
    await StatsPage({
      searchParams: Promise.resolve({ key: "page-secret", view: "bad-view" }),
    });

    expect(mocks.getRegistrationStats).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      limit: 20,
      statement: "all",
      teamType: "all",
      to: null,
      view: "overview",
    });
  });

  it("renders detailed guidance when service-role env is missing", async () => {
    mocks.getRegistrationStats.mockResolvedValue({
      error: "Stats service role client is not configured.",
      ok: false,
      status: 500,
    });

    const page = await StatsPage({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });
    render(page);

    expect(screen.getByText(/stats unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Missing Supabase Service-Role Configuration/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Supabase service-role environment variables are missing in the runtime/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/doppler run -- bun dev/i)).toBeInTheDocument();
  });

  it("renders query failure guidance when stats fetch fails", async () => {
    mocks.getRegistrationStats.mockResolvedValue({
      error: "Failed to fetch registrations for stats.",
      ok: false,
      status: 500,
    });

    const page = await StatsPage({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });
    render(page);

    expect(screen.getByText(/stats unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Supabase Query Failed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Failed to fetch registrations for stats\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/eventsregistrations table exists/i),
    ).toBeInTheDocument();
  });
});
