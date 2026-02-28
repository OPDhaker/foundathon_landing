import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type InstitutionsSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const InstitutionsSection = ({ payload }: InstitutionsSectionProps) => (
  <StatsSectionRenderer
    description="Institution and club demographics with SRM vs external source mix."
    payload={payload}
    title="Institutions"
  />
);

export default InstitutionsSection;
