import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type ExportAction = {
  dataset: string;
  href: string;
  label: string;
};

type ExportsSectionProps = {
  exportActions: ExportAction[];
  payload: RegistrationStatsViewPayload;
};

const ExportsSection = ({ exportActions, payload }: ExportsSectionProps) => (
  <StatsSectionRenderer
    actions={
      <div className="flex flex-wrap justify-end gap-2">
        {exportActions.map((action) => (
          <a
            key={action.dataset}
            className="inline-flex h-8 items-center rounded-md border border-fnblue/50 bg-fnblue/10 px-3 text-xs font-bold uppercase tracking-wide text-fnblue hover:bg-fnblue hover:text-white"
            href={action.href}
          >
            Download {action.label}
          </a>
        ))}
      </div>
    }
    description="CSV dataset exports for downstream workflows with active filters applied."
    payload={payload}
    title="Exports"
  />
);

export default ExportsSection;
