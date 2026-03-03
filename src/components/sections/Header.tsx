import { getAuthUiState } from "@/lib/auth-ui-state";
import { getRegistrationsOpen } from "@/server/problem-statements/cap-settings";
import HeaderClient from "./HeaderClient";

const Header = async () => {
  const [{ isSignedIn, teamId }, registrationsOpen] = await Promise.all([
    getAuthUiState(),
    getRegistrationsOpen(),
  ]);
  return (
    <HeaderClient
      initialIsSignedIn={isSignedIn}
      initialTeamId={teamId}
      registrationsOpen={registrationsOpen}
    />
  );
};

export default Header;
