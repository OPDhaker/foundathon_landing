export type StatsViewConfig = {
  description: string;
  id: StatsView;
  label: string;
};

export const STATS_VIEWS = [
  {
    description: "Executive KPI snapshot and high-level performance.",
    id: "overview",
    label: "Overview",
  },
  {
    description: "Daily intake velocity and registration flow.",
    id: "registrations",
    label: "Registrations",
  },
  {
    description: "Problem statement capacity and allocation pressure.",
    id: "statements",
    label: "Statements",
  },
  {
    description: "PPT submission pipeline and completion momentum.",
    id: "submissions",
    label: "Submissions",
  },
  {
    description: "Review queue and approval status health.",
    id: "approvals",
    label: "Approvals",
  },
  {
    description: "Institution and club/source demographics.",
    id: "institutions",
    label: "Institutions",
  },
  {
    description: "Data integrity, anomalies, and schema quality.",
    id: "quality",
    label: "Data Quality",
  },
  {
    description: "CSV exports for downstream operations.",
    id: "exports",
    label: "Exports",
  },
] as const satisfies readonly StatsViewConfig[];

export type StatsView = (typeof STATS_VIEWS)[number]["id"];

export const STATS_DEFAULT_VIEW: StatsView = "overview";

const STATS_VIEW_SET = new Set<StatsView>(STATS_VIEWS.map((view) => view.id));

export const isStatsView = (
  value: string | null | undefined,
): value is StatsView =>
  typeof value === "string" && STATS_VIEW_SET.has(value as StatsView);

export const parseStatsView = (value: string | null | undefined): StatsView =>
  isStatsView(value) ? value : STATS_DEFAULT_VIEW;

export const STATS_EXPORT_DATASETS = [
  "overview",
  "registrations",
  "statements",
  "submissions",
  "approvals",
  "institutions",
  "quality",
  "exports",
] as const;

export type StatsExportDataset = (typeof STATS_EXPORT_DATASETS)[number];

export const STATS_DATASET_VIEW_MAP: Record<StatsExportDataset, StatsView> = {
  approvals: "approvals",
  exports: "exports",
  institutions: "institutions",
  overview: "overview",
  quality: "quality",
  registrations: "registrations",
  statements: "statements",
  submissions: "submissions",
};
