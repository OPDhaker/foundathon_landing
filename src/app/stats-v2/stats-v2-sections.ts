import { isStatsView, type StatsView } from "@/app/stats/stats-views";

export const STATS_V2_SECTION_IDS = ["intake", "review", "quality"] as const;

export type StatsV2Section = (typeof STATS_V2_SECTION_IDS)[number];

export type StatsV2SectionConfig = {
  description: string;
  id: StatsV2Section;
  label: string;
};

export const STATS_V2_SECTIONS: readonly StatsV2SectionConfig[] = [
  {
    description: "Registration intake flow, demand, and capacity pressure.",
    id: "intake",
    label: "Intake",
  },
  {
    description: "Review backlog, queue aging, and unresolved approvals.",
    id: "review",
    label: "Review",
  },
  {
    description:
      "Data reliability, anomalies, and operational quality blockers.",
    id: "quality",
    label: "Quality",
  },
];

export const STATS_V2_DEFAULT_SECTION: StatsV2Section = "intake";

const STATS_V2_SECTION_SET = new Set<StatsV2Section>(
  STATS_V2_SECTIONS.map((section) => section.id),
);

export const isStatsV2Section = (
  value: string | null | undefined,
): value is StatsV2Section =>
  typeof value === "string" &&
  STATS_V2_SECTION_SET.has(value as StatsV2Section);

export const parseStatsV2Section = (
  value: string | null | undefined,
): StatsV2Section =>
  isStatsV2Section(value) ? value : STATS_V2_DEFAULT_SECTION;

export const STATS_V2_LEGACY_VIEW_SECTION_MAP: Record<
  StatsView,
  StatsV2Section
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

export const mapLegacyStatsViewToSection = (
  view: string | null | undefined,
): StatsV2Section | null => {
  if (!isStatsView(view)) {
    return null;
  }

  return STATS_V2_LEGACY_VIEW_SECTION_MAP[view];
};

export const STATS_V2_EXPORT_DATASETS = [
  "intake_workstream",
  "review_workstream",
  "quality_workstream",
  "blockers_review_overdue",
  "blockers_pending_submission",
  "blockers_data_quality",
] as const;

export type StatsV2ExportDataset = (typeof STATS_V2_EXPORT_DATASETS)[number];

export type StatsV2ExportDatasetConfig = {
  description: string;
  id: StatsV2ExportDataset;
  label: string;
  section: StatsV2Section;
};

export const STATS_V2_EXPORT_DATASET_CONFIGS: readonly StatsV2ExportDatasetConfig[] =
  [
    {
      description: "All intake action rows sorted by most recent registration.",
      id: "intake_workstream",
      label: "Intake Workstream",
      section: "intake",
    },
    {
      description: "All pending-review queue rows sorted by pending age.",
      id: "review_workstream",
      label: "Review Workstream",
      section: "review",
    },
    {
      description: "All issue-queue rows sorted by issue severity.",
      id: "quality_workstream",
      label: "Quality Workstream",
      section: "quality",
    },
    {
      description:
        "Pending-review teams overdue by at least 4 days, including unknown pending age.",
      id: "blockers_review_overdue",
      label: "Blockers: Review Overdue",
      section: "review",
    },
    {
      description: "Teams pending presentation submission sorted oldest first.",
      id: "blockers_pending_submission",
      label: "Blockers: Pending Submission",
      section: "review",
    },
    {
      description: "Teams with one or more data quality issues.",
      id: "blockers_data_quality",
      label: "Blockers: Data Quality",
      section: "quality",
    },
  ];

const STATS_V2_EXPORT_DATASET_SET = new Set<StatsV2ExportDataset>(
  STATS_V2_EXPORT_DATASET_CONFIGS.map((dataset) => dataset.id),
);

export const isStatsV2ExportDataset = (
  value: string | null | undefined,
): value is StatsV2ExportDataset =>
  typeof value === "string" &&
  STATS_V2_EXPORT_DATASET_SET.has(value as StatsV2ExportDataset);

export const getStatsV2ExportDatasetConfig = (
  dataset: StatsV2ExportDataset,
): StatsV2ExportDatasetConfig => {
  const config = STATS_V2_EXPORT_DATASET_CONFIGS.find(
    (entry) => entry.id === dataset,
  );

  if (!config) {
    throw new Error(`Missing stats-v2 dataset config for: ${dataset}`);
  }

  return config;
};
