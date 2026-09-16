import { groupResultsByType, flattenGroups, splitOnMatch } from "../searchPresentation";
import type { SearchResult } from "core/types/search";

const result = (
  type: SearchResult["type"],
  id: string,
  title = id
): SearchResult => ({ id, type, title, content: "", matches: [], matchCount: 1 });

describe("groupResultsByType", () => {
  it("orders groups by the position of their best result, not by a fixed type order", () => {
    // Story leads because SearchService already sorted globally by relevance.
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(groups.map((g) => g.type)).toEqual(["story", "npc"]);
  });

  it("preserves the incoming order of results within a group", () => {
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(groups[0].results.map((r) => r.id)).toEqual(["s1", "s2"]);
  });

  it("drops types with no results rather than rendering an empty heading", () => {
    const groups = groupResultsByType([result("npc", "n1")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("npc");
  });

  it("labels groups with the uppercase plural heading from the mock", () => {
    const labels = groupResultsByType([
      result("npc", "n"), result("story", "s"), result("note", "o"),
      result("quest", "q"), result("location", "l"), result("rumors", "r"),
    ]).map((g) => g.label);
    expect(labels).toEqual(["NPCS", "STORY", "NOTES", "QUESTS", "LOCATIONS", "RUMORS"]);
  });

  it("returns an empty array for no results", () => {
    expect(groupResultsByType([])).toEqual([]);
  });
});

describe("flattenGroups", () => {
  it("returns results in the order they are rendered, so the keyboard index matches the eye", () => {
    const groups = groupResultsByType([
      result("story", "s1"),
      result("npc", "n1"),
      result("story", "s2"),
    ]);
    expect(flattenGroups(groups).map((r) => r.id)).toEqual(["s1", "s2", "n1"]);
  });
});

describe("splitOnMatch", () => {
  it("splits around a literal match", () => {
    expect(splitOnMatch("meet Droop here", "Droop")).toEqual([
      { text: "meet ", isMatch: false },
      { text: "Droop", isMatch: true },
      { text: " here", isMatch: false },
    ]);
  });

  it("matches case-insensitively but preserves the original casing", () => {
    expect(splitOnMatch("Droop", "droop")).toEqual([{ text: "Droop", isMatch: true }]);
  });

  it("marks every occurrence", () => {
    expect(splitOnMatch("droop and droop", "droop").filter((s) => s.isMatch)).toHaveLength(2);
  });

  it("returns one unmarked segment when there is no literal match", () => {
    // Fuzzy subsequence hits still rank and still render -- just unhighlighted.
    expect(splitOnMatch("Cragmaw Hideout", "drp")).toEqual([
      { text: "Cragmaw Hideout", isMatch: false },
    ]);
  });

  it("returns one unmarked segment for an empty query", () => {
    expect(splitOnMatch("anything", "")).toEqual([{ text: "anything", isMatch: false }]);
    expect(splitOnMatch("anything", "   ")).toEqual([{ text: "anything", isMatch: false }]);
  });

  it("does not throw on regex-special characters in the query", () => {
    expect(() => splitOnMatch("a (b) c", "(b)")).not.toThrow();
    expect(splitOnMatch("a (b) c", "(b)")).toEqual([
      { text: "a ", isMatch: false },
      { text: "(b)", isMatch: true },
      { text: " c", isMatch: false },
    ]);
  });

  it("returns an empty array for empty text", () => {
    expect(splitOnMatch("", "droop")).toEqual([]);
  });
});
