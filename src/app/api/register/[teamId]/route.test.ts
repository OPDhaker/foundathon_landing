import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readTeamsMock = vi.fn();
const writeTeamsMock = vi.fn();

vi.mock("@/lib/register-store", () => ({
  readTeams: readTeamsMock,
  writeTeams: writeTeamsMock,
}));

const makeParams = (teamId: string) => ({
  params: Promise.resolve({ teamId }),
});

describe("/api/register/[teamId] route", () => {
  const teamId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    readTeamsMock.mockReset();
    writeTeamsMock.mockReset();
  });

  it("GET returns team when id exists", async () => {
    readTeamsMock.mockResolvedValueOnce([{ id: teamId, teamType: "srm" }]);
    const { GET } = await import("./route");
    const req = new NextRequest(`http://localhost/api/register/${teamId}`);

    const res = await GET(req, makeParams(teamId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.team.id).toBe(teamId);
  });

  it("PATCH updates existing team", async () => {
    const existing = {
      id: teamId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      teamType: "srm",
      teamName: "Old Team",
      lead: {
        name: "Lead",
        raNumber: "RA0000000000001",
        netId: "od7270",
        dept: "CSE",
        contact: 9999999999,
      },
      members: [
        {
          name: "M1",
          raNumber: "RA0000000000002",
          netId: "ab1234",
          dept: "CSE",
          contact: 8888888888,
        },
        {
          name: "M2",
          raNumber: "RA0000000000003",
          netId: "cd5678",
          dept: "ECE",
          contact: 7777777777,
        },
      ],
    };

    readTeamsMock.mockResolvedValueOnce([existing]);
    writeTeamsMock.mockResolvedValueOnce(undefined);

    const { PATCH } = await import("./route");
    const req = new NextRequest(`http://localhost/api/register/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify({
        teamType: "srm",
        teamName: "New Team",
        lead: existing.lead,
        members: existing.members,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PATCH(req, makeParams(teamId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.team.teamName).toBe("New Team");
    expect(writeTeamsMock).toHaveBeenCalledTimes(1);
  });

  it("DELETE removes team by route param", async () => {
    readTeamsMock.mockResolvedValueOnce([
      { id: teamId },
      { id: "22222222-2222-4222-8222-222222222222" },
    ]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await import("./route");
    const req = new NextRequest(`http://localhost/api/register/${teamId}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, makeParams(teamId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([
      { id: "22222222-2222-4222-8222-222222222222" },
    ]);
  });

  it("PATCH keeps updated clubName for non-SRM club teams", async () => {
    const existing = {
      id: teamId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      teamType: "non_srm",
      teamName: "Old NonSRM",
      collegeName: "ABC College",
      isClub: true,
      clubName: "Old Club",
      lead: {
        name: "Lead",
        collegeId: "NID1",
        collegeEmail: "lead@abc.edu",
        contact: 9876543210,
      },
      members: [
        {
          name: "M1",
          collegeId: "NID2",
          collegeEmail: "m1@abc.edu",
          contact: 9876543211,
        },
        {
          name: "M2",
          collegeId: "NID3",
          collegeEmail: "m2@abc.edu",
          contact: 9876543212,
        },
      ],
    };

    readTeamsMock.mockResolvedValueOnce([existing]);
    writeTeamsMock.mockResolvedValueOnce(undefined);

    const { PATCH } = await import("./route");
    const req = new NextRequest(`http://localhost/api/register/${teamId}`, {
      method: "PATCH",
      body: JSON.stringify({
        teamType: "non_srm",
        teamName: "New NonSRM",
        collegeName: "ABC College",
        isClub: true,
        clubName: "Updated Club",
        lead: existing.lead,
        members: existing.members,
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await PATCH(req, makeParams(teamId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.team.clubName).toBe("Updated Club");
    expect(body.team.isClub).toBe(true);
  });

  it("rejects invalid teamId format", async () => {
    const { GET } = await import("./route");
    const req = new NextRequest("http://localhost/api/register/not-a-uuid");

    const res = await GET(req, makeParams("not-a-uuid"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("invalid");
  });
});
