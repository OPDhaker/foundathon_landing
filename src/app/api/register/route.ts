import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { type TeamRecord, teamSubmissionSchema } from "@/lib/register-schema";
import { readTeams, writeTeams } from "@/lib/register-store";

const JSON_HEADERS = { "Cache-Control": "no-store" };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isJsonRequest = (request: NextRequest) =>
  request.headers.get("content-type")?.includes("application/json");

const parseRequestJson = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const toTeamSummary = (team: TeamRecord) => ({
  id: team.id,
  teamName: team.teamName,
  teamType: team.teamType,
  leadName: team.lead.name,
  memberCount: 1 + team.members.length,
  createdAt: team.createdAt,
  updatedAt: team.updatedAt,
});

export async function GET() {
  const teams = await readTeams();
  const summaries = teams.map(toTeamSummary);
  return NextResponse.json({ teams: summaries }, { headers: JSON_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!isJsonRequest(request)) {
    return NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415, headers: JSON_HEADERS },
    );
  }

  const body = await parseRequestJson(request);
  if (body === null) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const parsed = teamSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const now = new Date().toISOString();
  const team: TeamRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...parsed.data,
  };

  const teams = await readTeams();
  const nextTeams = [team, ...teams];
  await writeTeams(nextTeams);

  return NextResponse.json(
    { team, teams: nextTeams.map(toTeamSummary) },
    { status: 201, headers: JSON_HEADERS },
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Team id is required." },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const teams = await readTeams();
  const nextTeams = teams.filter((team) => team.id !== id);
  if (nextTeams.length === teams.length) {
    return NextResponse.json(
      { error: "Team not found." },
      { status: 404, headers: JSON_HEADERS },
    );
  }
  await writeTeams(nextTeams);

  return NextResponse.json(
    { teams: nextTeams.map(toTeamSummary) },
    { headers: JSON_HEADERS },
  );
}
