import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type ApprovalsSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const ApprovalsSection = ({ payload }: ApprovalsSectionProps) => (
  <StatsSectionRenderer
    description="Review workflow health with queue aging and oldest not-reviewed teams."
    payload={payload}
    title="Approvals"
  />
);

export default ApprovalsSection;
