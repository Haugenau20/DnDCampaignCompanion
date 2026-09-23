// src/features/collaboration/notes/utils/__tests__/entity-path.test.ts

import { entityPath } from "../entity-path";

describe("entityPath", () => {
  test.each([
    ["quest", "q-1", "/quests/q-1"],
    ["npc", "npc-1", "/npcs/npc-1"],
    ["location", "loc-1", "/locations/loc-1"],
  ] as const)("a %s opens its own page", (type, id, expected) => {
    expect(entityPath(type, id)).toBe(expected);
  });

  test("a rumour has no page, so it is highlighted in the directory", () => {
    expect(entityPath("rumor", "r-1")).toBe("/rumors?highlight=r-1");
  });

  test("no record with its own page is sent to a directory", () => {
    for (const type of ["quest", "npc", "location"] as const) {
      expect(entityPath(type, "x")).not.toContain("highlight");
    }
  });
});
