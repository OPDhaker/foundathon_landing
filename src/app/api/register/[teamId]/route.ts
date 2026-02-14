import { type NextRequest, NextResponse } from "next/server";
import { type TeamRecord, teamSubmissionSchema } from "@/lib/register-schema";
import { readTeams, writeTeams } from "@/lib/register-store";

type Params = { params: Promise<{ teamId: string }> };

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

export async function GET(_: NextRequest, { params }: Params) {
  const { teamId } = await params;
  if (!UUID_PATTERN.test(teamId)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const teams = await readTeams();
  const team = teams.find((item) => item.id === teamId);

  if (!team) {
    return NextResponse.json(
      { error: "Team not found." },
      { status: 404, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ team }, { headers: JSON_HEADERS });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { teamId } = await params;
  if (!UUID_PATTERN.test(teamId)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { status: 400, headers: JSON_HEADERS },
    );
  }
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

  const teams = await readTeams();
  const index = teams.findIndex((item) => item.id === teamId);

  if (index === -1) {
    return NextResponse.json(
      { error: "Team not found." },
      { status: 404, headers: JSON_HEADERS },
    );
  }

  const previous = teams[index];
  const updated: TeamRecord = {
    ...parsed.data,
    id: previous.id,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const nextTeams = teams.map((item, idx) => (idx === index ? updated : item));
  await writeTeams(nextTeams);

  return NextResponse.json({ team: updated }, { headers: JSON_HEADERS });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { teamId } = await params;
  if (!UUID_PATTERN.test(teamId)) {
    return NextResponse.json(
      { error: "Team id is invalid." },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const teams = await readTeams();
  const nextTeams = teams.filter((item) => item.id !== teamId);
  if (nextTeams.length === teams.length) {
    return NextResponse.json(
      { error: "Team not found." },
      { status: 404, headers: JSON_HEADERS },
    );
  }
  await writeTeams(nextTeams);

  return NextResponse.json({ teams: nextTeams }, { headers: JSON_HEADERS });
}
