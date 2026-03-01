"use client";

import Link from "next/link";
import { useEffect } from "react";
import StatsSectionRenderer from "@/app/stats/sections/section-renderer";
import {
  buildStatsSearchParams,
  STATS_APPROVAL_FILTERS,
  STATS_LIMIT_DEFAULT,
  STATS_LIMIT_MAX,
  STATS_TEAM_TYPE_FILTERS,
} from "@/app/stats/stats-filters";
import type { StatsView } from "@/app/stats/stats-views";
import { buildStatsV2SearchParams } from "@/app/stats-v2/stats-v2-filters";
import {
  STATS_V2_SECTIONS,
  type StatsV2Section,
} from "@/app/stats-v2/stats-v2-sections";
import type { RegistrationStatsV2Response } from "@/server/registration-stats/service-v2";

type StatsV2DashboardClientProps = {
  generatedAtLabel: string;
  stats: RegistrationStatsV2Response;
  statsKey: string;
};

type ViewFilters = RegistrationStatsV2Response["meta"]["appliedFilters"];

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const toLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatMetricValue = ({
  unit,
  value,
}: {
  unit: string;
  value: number | string;
}) => {
  if (typeof value === "string") {
    return value;
  }

  if (unit.toLowerCase().includes("percent")) {
    return `${NUMBER_FORMATTER.format(value)}%`;
  }

  return NUMBER_FORMATTER.format(value);
};

const buildDatasetHref = ({
  dataset,
  filters,
  key,
  section,
}: {
  dataset: string;
  filters: ViewFilters;
  key: string;
  section: StatsV2Section;
}) => {
  const params = buildStatsV2SearchParams({
    filters,
    key,
    section,
  });
  params.set("dataset", dataset);

  return `/api/stats/registrations/v2/export?${params.toString()}`;
};

const SECTION_TITLES: Record<StatsV2Section, string> = {
  intake: "Intake",
  quality: "Quality",
  review: "Review",
};

const SECTION_DESCRIPTIONS: Record<StatsV2Section, string> = {
  intake:
    "Track registrations, statement pressure, and incoming queue composition with the Recent Registrations action table.",
  quality:
    "Track data anomalies and quality blockers that affect downstream execution with the Issue Queue action table.",
  review:
    "Track approval backlog, queue aging, and unreviewed high-risk teams with the Pending Review Queue action table.",
};

const WORKSTREAM_DATASET_BY_SECTION: Record<StatsV2Section, string> = {
  intake: "intake_workstream",
  quality: "quality_workstream",
  review: "review_workstream",
};

const STATS_V1_VIEW_BY_SECTION: Record<StatsV2Section, StatsView> = {
  intake: "overview",
  quality: "quality",
  review: "approvals",
};

const StatsV2DashboardClient = ({
  generatedAtLabel,
  stats,
  statsKey,
}: StatsV2DashboardClientProps) => {
  const activeSection = stats.meta.activeSection;
  const appliedFilters = stats.meta.appliedFilters;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hasSectionInUrl = searchParams.get("section") !== null;
    const hasLegacyViewInUrl = searchParams.get("view") !== null;

    if (!hasSectionInUrl && !hasLegacyViewInUrl) {
      return;
    }

    const sectionElement = document.getElementById(`section-${activeSection}`);
    if (!sectionElement) {
      return;
    }

    sectionElement.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [activeSection]);

  const resetParams = buildStatsV2SearchParams({
    filters: {
      approval: "all",
      from: null,
      limit: STATS_LIMIT_DEFAULT,
      statement: "all",
      teamType: "all",
      to: null,
    },
    key: statsKey,
    section: activeSection,
  });
  const statsV2Href = `/stats-v2?${buildStatsV2SearchParams({
    filters: appliedFilters,
    key: statsKey,
    section: activeSection,
  }).toString()}`;
  const statsV1Href = `/stats?${buildStatsSearchParams({
    filters: {
      approval: appliedFilters.approval,
      from: appliedFilters.from,
      limit: appliedFilters.limit,
      statement: appliedFilters.statement,
      teamType: appliedFilters.teamType,
      to: appliedFilters.to,
    },
    key: statsKey,
    view: STATS_V1_VIEW_BY_SECTION[activeSection],
  }).toString()}`;

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
                className="ml-2 inline-flex rounded-full border border-fnred bg-fnred px-3 py-1 text-xs font-bold uppercase tracking-wider text-white hover:bg-fnred/85"
                href={statsV2Href}
              >
                OPS Command centre
              </Link>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-4xl">
                Ops Command Center
              </h1>
              <p className="mt-2 text-sm text-foreground/70">
                {stats.event.eventTitle} ({stats.event.eventId})
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/70">
                Active section: {SECTION_TITLES[activeSection]}
              </p>
            </div>
            <div className="text-right text-xs font-medium uppercase tracking-wider text-foreground/60">
              <p>Generated (UTC): {generatedAtLabel}</p>
              <p className="mt-1">
                Trend timezone: {stats.meta.registrationTrendTimezone}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.summary.map((metric) => (
              <article
                key={metric.id}
                className="rounded-xl border border-b-4 border-fnred/70 bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-black text-fnred">
                  {formatMetricValue({
                    unit: metric.unit,
                    value: metric.value,
                  })}
                </p>
              </article>
            ))}
          </div>

          <nav
            className="mt-6 flex flex-wrap gap-2"
            aria-label="Stats v2 sections"
          >
            {STATS_V2_SECTIONS.map((section) => {
              const params = buildStatsV2SearchParams({
                filters: appliedFilters,
                key: statsKey,
                section: section.id,
              });
              const isActive = section.id === activeSection;

              return (
                <Link
                  key={section.id}
                  href={`/stats-v2?${params.toString()}#section-${section.id}`}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                    isActive
                      ? "border-fnblue bg-fnblue text-white"
                      : "border-foreground/20 bg-white text-foreground/75 hover:border-fnblue hover:text-fnblue",
                  ].join(" ")}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>

          <form
            action="/stats-v2"
            className="mt-6 rounded-xl border border-foreground/12 bg-white p-4"
            method="get"
          >
            <input name="key" type="hidden" value={statsKey} />
            <input name="section" type="hidden" value={activeSection} />
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
                href={`/stats-v2?${resetParams.toString()}`}
              >
                Reset
              </Link>
            </div>
          </form>

          <section className="mt-6 rounded-xl border border-foreground/12 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-tight text-foreground/80">
                Dataset Exports
              </h2>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                Section-aware exports with active filters
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.exports.datasets.map((dataset) => (
                <a
                  key={dataset.id}
                  className="inline-flex h-8 items-center rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-xs font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
                  href={buildDatasetHref({
                    dataset: dataset.id,
                    filters: appliedFilters,
                    key: statsKey,
                    section: dataset.section,
                  })}
                >
                  {dataset.label} ({dataset.rowCount})
                </a>
              ))}
            </div>
          </section>

          <div className="mt-8 space-y-8">
            {STATS_V2_SECTIONS.map((section) => {
              const payload = stats.sections[section.id];
              const isActive = section.id === activeSection;
              const workstreamDataset =
                WORKSTREAM_DATASET_BY_SECTION[section.id];

              return (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className={[
                    "scroll-mt-24 rounded-2xl border p-1",
                    isActive
                      ? "border-fnblue/70 bg-fnblue/6"
                      : "border-transparent bg-transparent",
                  ].join(" ")}
                >
                  <StatsSectionRenderer
                    actions={
                      <a
                        className="inline-flex h-8 items-center rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-xs font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
                        href={buildDatasetHref({
                          dataset: workstreamDataset,
                          filters: appliedFilters,
                          key: statsKey,
                          section: section.id,
                        })}
                      >
                        Export {section.label}
                      </a>
                    }
                    description={`${SECTION_DESCRIPTIONS[section.id]} ${section.description}`}
                    payload={payload}
                    title={`${SECTION_TITLES[section.id]} Workstream`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default StatsV2DashboardClient;
