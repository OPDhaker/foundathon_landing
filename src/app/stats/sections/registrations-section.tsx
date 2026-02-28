import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type RegistrationsSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const RegistrationsSection = ({ payload }: RegistrationsSectionProps) => (
  <StatsSectionRenderer
    description="Daily intake history in IST with cumulative growth and team type split."
    payload={payload}
    title="Registrations"
  />
);

export default RegistrationsSection;
