import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistrationStatsV2Response } from "@/server/registration-stats/service-v2";
import StatsV2Page from "./page";

const mocks = vi.hoisted(() => ({
  getFoundathonStatsPageKey: vi.fn(),
  getRegistrationStatsV2: vi.fn(),
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

vi.mock("@/server/registration-stats/service-v2", () => ({
  getRegistrationStatsV2: mocks.getRegistrationStatsV2,
}));

vi.mock("./stats-v2-dashboard-client", () => ({
  default: ({
    generatedAtLabel,
    stats,
    statsKey,
  }: {
    generatedAtLabel: string;
    stats: RegistrationStatsV2Response;
    statsKey: string;
  }) => (
    <div data-testid="stats-v2-dashboard-client">
      <p>Ops Command Center</p>
      <p>Active Section: {stats.meta.activeSection}</p>
      <p>Stats Key: {statsKey}</p>
      <p>Generated (UTC): {generatedAtLabel}</p>
    </div>
  ),
}));

const buildStatsPayload = (): RegistrationStatsV2Response => ({
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
        description: "desc",
        id: "intake_workstream",
        label: "Intake Workstream",
        rowCount: 1,
        section: "intake",
      },
    ],
  },
  filters: {
    excludedRegistrationEmails: ["opdhaker2007@gmail.com"],
    excludedRows: 0,
    includedRows: 1,
  },
  generatedAt: "2026-03-01T12:00:00.000Z",
  meta: {
    activeSection: "intake",
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
    totalRowsAfterFilters: 1,
    totalRowsBeforeFilters: 1,
  },
  sections: {
    intake: {
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
    review: {
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
  summary: [
    { id: "pendingReview", label: "Pending Review", unit: "teams", value: 0 },
    {
      id: "oldestPendingDays",
      label: "Oldest Pending",
      unit: "days",
      value: "N/A",
    },
    {
      id: "pendingSubmissions",
      label: "Pending Submissions",
      unit: "teams",
      value: 0,
    },
    { id: "anomalyRate", label: "Anomaly Rate", unit: "percent", value: 0 },
  ],
});

describe("/stats-v2 page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getFoundathonStatsPageKey.mockReturnValue("page-secret");
    mocks.getRegistrationStatsV2.mockResolvedValue({
      data: buildStatsPayload(),
      ok: true,
      status: 200,
    });
  });

  it("calls notFound when key is missing", async () => {
    await expect(
      StatsV2Page({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalled();
    expect(mocks.getRegistrationStatsV2).not.toHaveBeenCalled();
  });

  it("calls notFound when key is invalid", async () => {
    await expect(
      StatsV2Page({
        searchParams: Promise.resolve({ key: "wrong" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalled();
    expect(mocks.getRegistrationStatsV2).not.toHaveBeenCalled();
  });

  it("renders dashboard content when key is valid", async () => {
    const page = await StatsV2Page({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });

    render(page);

    expect(screen.getByTestId("stats-v2-dashboard-client")).toBeInTheDocument();
    expect(screen.getByText(/active section: intake/i)).toBeInTheDocument();
    expect(screen.getByText(/stats key: page-secret/i)).toBeInTheDocument();
  });

  it("maps legacy view to section before service call", async () => {
    await StatsV2Page({
      searchParams: Promise.resolve({
        key: "page-secret",
        view: "submissions",
      }),
    });

    expect(mocks.getRegistrationStatsV2).toHaveBeenCalledWith({
      approval: "all",
      from: null,
      legacyView: "submissions",
      limit: 20,
      section: "review",
      statement: "all",
      teamType: "all",
      to: null,
    });
  });

  it("renders error UI when service fails", async () => {
    mocks.getRegistrationStatsV2.mockResolvedValueOnce({
      error: "Failed to fetch registrations for stats.",
      ok: false,
      status: 500,
    });

    const page = await StatsV2Page({
      searchParams: Promise.resolve({ key: "page-secret" }),
    });

    render(page);

    expect(screen.getByText(/Stats V2 Unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Failed to fetch registrations for stats\./i),
    ).toBeInTheDocument();
  });
});
