import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readTeamsMock = vi.fn();
const writeTeamsMock = vi.fn();

vi.mock("@/lib/register-store", () => ({
  readTeams: readTeamsMock,
  writeTeams: writeTeamsMock,
}));

describe("/api/register route", () => {
  const srmTeam = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    teamType: "srm" as const,
    teamName: "Alpha",
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

  beforeEach(() => {
    readTeamsMock.mockReset();
    writeTeamsMock.mockReset();
  });

  it("GET returns summarized teams", async () => {
    readTeamsMock.mockResolvedValueOnce([srmTeam]);
    const { GET } = await import("./route");

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams).toEqual([
      {
        id: srmTeam.id,
        teamName: "Alpha",
        teamType: "srm",
        leadName: "Lead",
        memberCount: 3,
        createdAt: srmTeam.createdAt,
        updatedAt: srmTeam.updatedAt,
      },
    ]);
  });

  it("POST rejects invalid payload", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({ teamType: "srm" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBeTruthy();
  });

  it("POST accepts valid payload and persists", async () => {
    readTeamsMock.mockResolvedValueOnce([]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        teamType: "srm",
        teamName: "Board Breakers",
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
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.team.teamName).toBe("Board Breakers");
    expect(writeTeamsMock).toHaveBeenCalledTimes(1);
  });

  it("POST persists clubName for non-SRM club teams", async () => {
    readTeamsMock.mockResolvedValueOnce([]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/register", {
      method: "POST",
      body: JSON.stringify({
        teamType: "non_srm",
        teamName: "Pitch Panthers",
        collegeName: "ABC College",
        isClub: true,
        clubName: "Innovators Club",
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
      }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.team.clubName).toBe("Innovators Club");
    expect(body.team.isClub).toBe(true);
  });

  it("DELETE removes team by query id", async () => {
    const t1 = { ...srmTeam, id: "11111111-1111-4111-8111-111111111111" };
    const t2 = { ...srmTeam, id: "22222222-2222-4222-8222-222222222222" };
    readTeamsMock.mockResolvedValueOnce([t1, t2]);
    writeTeamsMock.mockResolvedValueOnce(undefined);
    const { DELETE } = await import("./route");
    const req = new NextRequest(
      "http://localhost/api/register?id=11111111-1111-4111-8111-111111111111",
      {
        method: "DELETE",
      },
    );

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.teams[0].id).toBe("22222222-2222-4222-8222-222222222222");
    expect(writeTeamsMock).toHaveBeenCalledWith([t2]);
  });

  it("DELETE rejects invalid id format", async () => {
    const { DELETE } = await import("./route");
    const req = new NextRequest("http://localhost/api/register?id=not-a-uuid", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("invalid");
  });
});
