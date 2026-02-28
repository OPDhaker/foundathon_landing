import type { RegistrationStatsViewPayload } from "@/server/registration-stats/service";
import StatsSectionRenderer from "./section-renderer";

type StatementsSectionProps = {
  payload: RegistrationStatsViewPayload;
};

const StatementsSection = ({ payload }: StatementsSectionProps) => (
  <StatsSectionRenderer
    description="Capacity utilization, fill pressure, and leaderboard across problem statements."
    payload={payload}
    title="Statements"
  />
);

export default StatementsSection;
