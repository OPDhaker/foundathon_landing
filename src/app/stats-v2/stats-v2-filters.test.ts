import { describe, expect, it } from "vitest";
import {
  buildStatsV2SearchParams,
  parseStatsV2QueryInput,
  parseStatsV2QueryInputFromUrl,
} from "./stats-v2-filters";

describe("stats v2 filters", () => {
  it("defaults to intake section with all-time filters", () => {
    const query = parseStatsV2QueryInput({});

    expect(query).toEqual({
      approval: "all",
      from: null,
      legacyView: null,
      limit: 20,
      section: "intake",
      statement: "all",
      teamType: "all",
      to: null,
    });
  });

  it("maps legacy view to section when explicit section is missing", () => {
    const query = parseStatsV2QueryInput({
      view: "submissions",
    });

    expect(query.section).toBe("review");
    expect(query.legacyView).toBe("submissions");
  });

  it("prioritizes explicit section over legacy view", () => {
    const query = parseStatsV2QueryInput({
      section: "quality",
      view: "submissions",
    });

    expect(query.section).toBe("quality");
    expect(query.legacyView).toBe("submissions");
  });

  it("normalizes dates and limit", () => {
    const query = parseStatsV2QueryInput({
      approval: "accepted",
      from: "2026-03-02",
      limit: "999",
      statement: "ps-01",
      teamType: "srm",
      to: "2026-03-01",
    });

    expect(query).toMatchObject({
      approval: "accepted",
      from: "2026-03-01",
      limit: 100,
      section: "intake",
      statement: "ps-01",
      teamType: "srm",
      to: "2026-03-02",
    });
  });

  it("parses from URLSearchParams", () => {
    const query = parseStatsV2QueryInputFromUrl(
      new URLSearchParams(
        "view=quality&teamType=unknown&approval=invalid&limit=12&from=2026-02-01&to=2026-02-10",
      ),
    );

    expect(query).toEqual({
      approval: "invalid",
      from: "2026-02-01",
      legacyView: "quality",
      limit: 12,
      section: "quality",
      statement: "all",
      teamType: "unknown",
      to: "2026-02-10",
    });
  });

  it("builds stable query params", () => {
    const params = buildStatsV2SearchParams({
      filters: {
        approval: "accepted",
        from: "2026-02-01",
        limit: 25,
        statement: "ps-01",
        teamType: "srm",
        to: "2026-02-07",
      },
      key: "page-secret",
      section: "review",
    });

    expect(params.get("key")).toBe("page-secret");
    expect(params.get("section")).toBe("review");
    expect(params.get("approval")).toBe("accepted");
    expect(params.get("teamType")).toBe("srm");
    expect(params.get("statement")).toBe("ps-01");
    expect(params.get("limit")).toBe("25");
  });
});
