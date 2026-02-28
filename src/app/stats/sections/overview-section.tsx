import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type OverviewSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const OverviewSection = ({ payload }: OverviewSectionProps) => (
  <StatsSectionRenderer
    description="Executive health snapshot with fill velocity and submission momentum."
    payload={payload}
    title="Overview"
  />
);

export default OverviewSection;
