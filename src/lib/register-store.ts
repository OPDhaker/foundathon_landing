import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type TeamRecord, teamRecordListSchema } from "@/lib/register-schema";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "register-teams.json");

const toContactNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  }
  return 0;
};

export const readTeams = async (): Promise<TeamRecord[]> => {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    // Backward compatibility:
    // 1) old SRM records may not have a teamName field.
    // 2) old SRM member objects used collegeId instead of netId.
    // 3) old records may store contact as string.
    const normalized = parsed.map((team) => {
      if (!team || typeof team !== "object" || !("teamType" in team)) {
        return team;
      }

      if (team.teamType !== "srm") return team;

      const srmTeam = team as {
        teamName?: unknown;
        lead?: { netId?: unknown; collegeId?: unknown } & Record<
          string,
          unknown
        >;
        members?: Array<
          { netId?: unknown; collegeId?: unknown } & Record<string, unknown>
        >;
      } & Record<string, unknown>;

      const normalizedLead =
        srmTeam.lead && typeof srmTeam.lead === "object"
          ? {
              ...srmTeam.lead,
              netId:
                typeof srmTeam.lead.netId === "string"
                  ? srmTeam.lead.netId
                  : typeof srmTeam.lead.collegeId === "string"
                    ? srmTeam.lead.collegeId
                    : "",
              contact: toContactNumber(srmTeam.lead.contact),
            }
          : srmTeam.lead;

      const normalizedMembers = Array.isArray(srmTeam.members)
        ? srmTeam.members.map((member) => ({
            ...member,
            netId:
              typeof member.netId === "string"
                ? member.netId
                : typeof member.collegeId === "string"
                  ? member.collegeId
                  : "",
            contact: toContactNumber(member.contact),
          }))
        : srmTeam.members;

      return {
        ...srmTeam,
        teamName:
          typeof srmTeam.teamName === "string" ? srmTeam.teamName : "SRM Team",
        lead: normalizedLead,
        members: normalizedMembers,
      };
    });

    const normalizedNonSrmContact = normalized.map((team) => {
      if (!team || typeof team !== "object" || !("teamType" in team)) {
        return team;
      }
      if (team.teamType !== "non_srm") return team;

      const nonSrmTeam = team as {
        lead?: { contact?: unknown } & Record<string, unknown>;
        members?: Array<{ contact?: unknown } & Record<string, unknown>>;
      } & Record<string, unknown>;

      return {
        ...nonSrmTeam,
        lead:
          nonSrmTeam.lead && typeof nonSrmTeam.lead === "object"
            ? {
                ...nonSrmTeam.lead,
                contact: toContactNumber(nonSrmTeam.lead.contact),
              }
            : nonSrmTeam.lead,
        members: Array.isArray(nonSrmTeam.members)
          ? nonSrmTeam.members.map((member) => ({
              ...member,
              contact: toContactNumber(member.contact),
            }))
          : nonSrmTeam.members,
      };
    });

    const validated = teamRecordListSchema.safeParse(normalizedNonSrmContact);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
};

export const writeTeams = async (teams: TeamRecord[]) => {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await writeFile(tempFile, JSON.stringify(teams, null, 2), "utf8");
  await rename(tempFile, DATA_FILE);
};
