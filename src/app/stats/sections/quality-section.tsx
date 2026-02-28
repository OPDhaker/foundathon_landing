import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type QualitySectionProps = {
  payload: RegistrationStatsViewPayload;
};

const QualitySection = ({ payload }: QualitySectionProps) => (
  <StatsSectionRenderer
    description="Data reliability, anomaly composition, and top malformed field patterns."
    payload={payload}
    title="Data Quality"
  />
);

export default QualitySection;
