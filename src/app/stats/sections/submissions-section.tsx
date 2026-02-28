import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type SubmissionsSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const SubmissionsSection = ({ payload }: SubmissionsSectionProps) => (
  <StatsSectionRenderer
    description="PPT pipeline health with submitted vs pending progress and trend over time."
    payload={payload}
    title="Submissions"
  />
);

export default SubmissionsSection;
