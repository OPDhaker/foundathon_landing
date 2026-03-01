"use client";

import Link from "next/link";
import type { RegistrationStatsResponse } from "@/server/registration-stats/service";
import ApprovalsSection from "./sections/approvals-section";
import ExportsSection from "./sections/exports-section";
import InstitutionsSection from "./sections/institutions-section";
import OverviewSection from "./sections/overview-section";
import QualitySection from "./sections/quality-section";
import RegistrationsSection from "./sections/registrations-section";
import StatementsSection from "./sections/statements-section";
import SubmissionsSection from "./sections/submissions-section";
import {
  buildStatsSearchParams,
  STATS_APPROVAL_FILTERS,
  STATS_LIMIT_DEFAULT,
  STATS_LIMIT_MAX,
  STATS_TEAM_TYPE_FILTERS,
} from "./stats-filters";
import {
  STATS_EXPORT_DATASETS,
  STATS_VIEWS,
  type StatsExportDataset,
  type StatsView,
} from "./stats-views";

type StatsDashboardClientProps = {
  generatedAtLabel: string;
  stats: RegistrationStatsResponse;
  statsKey: string;
};

type ViewFilters = RegistrationStatsResponse["meta"]["appliedFilters"];

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const toDisplayDateTime = (value: string | null) => {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
};

const toLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toFilterSearchParams = ({
  filters,
  key,
  view,
}: {
  filters: ViewFilters;
  key: string;
  view: StatsView;
}) =>
  buildStatsSearchParams({
    filters: {
      approval: filters.approval,
      from: filters.from,
      limit: filters.limit,
      statement: filters.statement,
      teamType: filters.teamType,
      to: filters.to,
    },
    key,
    view,
  });

const buildExportHref = ({
  dataset,
  filters,
  key,
  view,
}: {
  dataset: StatsExportDataset;
  filters: ViewFilters;
  key: string;
  view: StatsView;
}) => {
  const params = toFilterSearchParams({ filters, key, view });
  params.delete("view");
  params.set("dataset", dataset);
  return `/api/stats/registrations/export?${params.toString()}`;
};

const getViewDescription = (view: StatsView) =>
  STATS_VIEWS.find((entry: (typeof STATS_VIEWS)[number]) => entry.id === view)
    ?.description ?? "Analytics view";

const STATS_V2_SECTION_BY_VIEW: Record<
  StatsView,
  "intake" | "quality" | "review"
> = {
  approvals: "review",
  exports: "review",
  institutions: "intake",
  overview: "intake",
  quality: "quality",
  registrations: "intake",
  statements: "intake",
  submissions: "review",
};

const StatsDashboardClient = ({
  generatedAtLabel,
  stats,
  statsKey,
}: StatsDashboardClientProps) => {
  const activeView = stats.meta.activeView;
  const appliedFilters = stats.meta.appliedFilters;
  const activeViewDescription = getViewDescription(activeView);
  const activeViewExportHref = buildExportHref({
    dataset: activeView as StatsExportDataset,
    filters: appliedFilters,
    key: statsKey,
    view: activeView,
  });

  const resetParams = buildStatsSearchParams({
    filters: {
      approval: "all",
      from: null,
      limit: STATS_LIMIT_DEFAULT,
      statement: "all",
      teamType: "all",
      to: null,
    },
    key: statsKey,
    view: activeView,
  });

  const exportActions = STATS_EXPORT_DATASETS.map((dataset) => ({
    dataset,
    href: buildExportHref({
      dataset,
      filters: appliedFilters,
      key: statsKey,
      view: activeView,
    }),
    label: toLabel(dataset),
  }));

  const statsV1Href = `/stats?${toFilterSearchParams({
    filters: appliedFilters,
    key: statsKey,
    view: activeView,
  }).toString()}`;
  const statsV2Params = buildStatsSearchParams({
    filters: {
      approval: appliedFilters.approval,
      from: appliedFilters.from,
      limit: appliedFilters.limit,
      statement: appliedFilters.statement,
      teamType: appliedFilters.teamType,
      to: appliedFilters.to,
    },
    key: statsKey,
    view: activeView,
  });
  statsV2Params.delete("view");
  statsV2Params.set("section", STATS_V2_SECTION_BY_VIEW[activeView]);
  const statsV2Href = `/stats-v2?${statsV2Params.toString()}`;

  const renderActiveSection = () => {
    switch (activeView) {
      case "overview":
        return <OverviewSection payload={stats.views.overview} />;
      case "registrations":
        return <RegistrationsSection payload={stats.views.registrations} />;
      case "statements":
        return <StatementsSection payload={stats.views.statements} />;
      case "submissions":
        return <SubmissionsSection payload={stats.views.submissions} />;
      case "approvals":
        return <ApprovalsSection payload={stats.views.approvals} />;
      case "institutions":
        return <InstitutionsSection payload={stats.views.institutions} />;
      case "quality":
        return <QualitySection payload={stats.views.quality} />;
      case "exports":
        return (
          <ExportsSection
            exportActions={exportActions}
            payload={stats.views.exports}
          />
        );
      default:
        return <OverviewSection payload={stats.views.overview} />;
    }
  };

  return (
    <main className="min-h-screen bg-gray-200 text-foreground relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: "url(/textures/circle-16px.svg)" }}
      />
      <div className="fncontainer relative py-10 md:py-14">
        <section className="rounded-2xl border border-b-4 border-fnblue bg-background/95 p-5 shadow-xl md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link
                className="inline-flex rounded-full border border-fnblue bg-fnblue/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fnblue hover:bg-fnblue hover:text-white"
                href={statsV1Href}
              >
                Private Stats Suite
              </Link>
              <Link
                className="ml-2 inline-flex rounded-full border border-fnred bg-fnred/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fnred hover:bg-fnred hover:text-white"
                href={statsV2Href}
              >
                OPS Command centre
              </Link>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-4xl">
                Unified Registration Analytics
              </h1>
              <p className="mt-2 text-sm text-foreground/70">
                {stats.event.eventTitle} ({stats.event.eventId})
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/70">
                {activeViewDescription}
              </p>
            </div>
            <div className="text-right text-xs font-medium uppercase tracking-wider text-foreground/60">
              <p>Generated (UTC): {generatedAtLabel}</p>
              <p className="mt-1">
                Trend timezone: {stats.meta.registrationTrendTimezone}
              </p>
              <a
                className="mt-3 inline-flex h-8 items-center rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-[11px] font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
                href={activeViewExportHref}
              >
                Export This View
              </a>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Stats views">
            {STATS_VIEWS.map((view) => {
              const params = toFilterSearchParams({
                filters: appliedFilters,
                key: statsKey,
                view: view.id,
              });
              const isActive = view.id === activeView;

              return (
                <Link
                  key={view.id}
                  href={`/stats?${params.toString()}`}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                    isActive
                      ? "border-fnblue bg-fnblue text-white"
                      : "border-foreground/20 bg-white text-foreground/75 hover:border-fnblue hover:text-fnblue",
                  ].join(" ")}
                >
                  {view.label}
                </Link>
              );
            })}
          </nav>

          <form
            action="/stats"
            className="mt-6 rounded-xl border border-foreground/12 bg-white p-4"
            method="get"
          >
            <input name="key" type="hidden" value={statsKey} />
            <input name="view" type="hidden" value={activeView} />
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                From
                <input
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.from ?? ""}
                  name="from"
                  type="date"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                To
                <input
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.to ?? ""}
                  name="to"
                  type="date"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Team Type
                <select
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.teamType}
                  name="teamType"
                >
                  {STATS_TEAM_TYPE_FILTERS.map((teamType) => (
                    <option key={teamType} value={teamType}>
                      {toLabel(teamType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Approval
                <select
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.approval}
                  name="approval"
                >
                  {STATS_APPROVAL_FILTERS.map((approval) => (
                    <option key={approval} value={approval}>
                      {toLabel(approval)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Statement
                <select
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.statement}
                  name="statement"
                >
                  <option value="all">All Statements</option>
                  {stats.meta.statementOptions.map((statement) => (
                    <option key={statement.id} value={statement.id}>
                      {statement.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Top Table Limit
                <input
                  className="h-9 rounded-md border border-foreground/15 bg-background px-2 text-sm text-foreground"
                  defaultValue={appliedFilters.limit}
                  max={STATS_LIMIT_MAX}
                  min={1}
                  name="limit"
                  type="number"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex h-9 items-center rounded-md border border-fnblue bg-fnblue px-3 text-sm font-bold uppercase tracking-wide text-white"
                type="submit"
              >
                Apply Filters
              </button>
              <Link
                className="inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm font-bold uppercase tracking-wide text-foreground/75"
                href={`/stats?${resetParams.toString()}`}
              >
                Reset
              </Link>
            </div>
          </form>

          <div className="mt-6">{renderActiveSection()}</div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <section className="rounded-xl border border-foreground/10 bg-white p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-fnblue">
                Filtered Scope
              </h3>
              <p className="mt-2 text-sm font-medium text-foreground/80">
                Before filters:{" "}
                {NUMBER_FORMATTER.format(stats.meta.totalRowsBeforeFilters)}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                After filters:{" "}
                {NUMBER_FORMATTER.format(stats.meta.totalRowsAfterFilters)}
              </p>
            </section>

            <section className="rounded-xl border border-foreground/10 bg-white p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-fnblue">
                Time Bounds (IST)
              </h3>
              <p className="mt-2 text-sm font-medium text-foreground/80">
                First registration:{" "}
                {toDisplayDateTime(stats.additionalStats.firstRegistrationAt)}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                Last registration:{" "}
                {toDisplayDateTime(stats.additionalStats.lastRegistrationAt)}
              </p>
            </section>

            <section className="rounded-xl border border-foreground/10 bg-white p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-fnblue">
                Submission Snapshot
              </h3>
              <p className="mt-2 text-sm font-medium text-foreground/80">
                Submitted teams:{" "}
                {NUMBER_FORMATTER.format(
                  stats.additionalStats.presentationSubmission.submittedTeams,
                )}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                Pending teams:{" "}
                {NUMBER_FORMATTER.format(
                  stats.additionalStats.presentationSubmission.pendingTeams,
                )}
              </p>
            </section>

            <section className="rounded-xl border border-foreground/10 bg-white p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-fnblue">
                Anomalies
              </h3>
              <p className="mt-2 text-sm font-medium text-foreground/80">
                Missing statement id:{" "}
                {NUMBER_FORMATTER.format(
                  stats.additionalStats.anomalies.missingProblemStatementId,
                )}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                Unknown statement id:{" "}
                {NUMBER_FORMATTER.format(
                  stats.additionalStats.anomalies.unknownProblemStatementId,
                )}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                Invalid team members:{" "}
                {NUMBER_FORMATTER.format(
                  stats.additionalStats.anomalies.missingOrInvalidTeamMembers,
                )}
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StatsDashboardClient;
