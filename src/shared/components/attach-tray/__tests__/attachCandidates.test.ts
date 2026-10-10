// src/shared/components/attach-tray/__tests__/attachCandidates.test.ts
import {
  buildCandidates,
  filterCandidates,
  groupCandidates,
  ATTACH_KIND_LABELS,
  ATTACH_KIND_NEW_LABELS,
  ATTACH_KIND_EMPTY_LABELS,
  attachRefs,
  type AttachKind,
} from "../attachCandidates";

const npc = (over: Record<string, unknown> = {}) => ({
  id: "thorin",
  name: "Thorin Oakenshield",
  occupation: "King under the Mountain",
  locationId: "erebor",
  dateAdded: "2026-01-01T00:00:00.000Z",
  ...over,
});

const location = (over: Record<string, unknown> = {}) => ({
  id: "erebor",
  name: "Erebor",
  type: "city",
  dateAdded: "2026-01-01T00:00:00.000Z",
  ...over,
});

const quest = (over: Record<string, unknown> = {}) => ({
  id: "reclaim-erebor",
  title: "Reclaim Erebor",
  status: "active",
  dateAdded: "2026-01-01T00:00:00.000Z",
  ...over,
});

const rumor = (over: Record<string, unknown> = {}) => ({
  id: "orcs-massing",
  title: "Orcs massing in the High Pass",
  status: "unconfirmed",
  dateAdded: "2026-01-01T00:00:00.000Z",
  ...over,
});

const sources = (over: Partial<Record<AttachKind, unknown[]>> = {}) => ({
  npc: [npc()],
  location: [location()],
  quest: [quest()],
  rumor: [rumor()],
  ...over,
});

describe("attachCandidates", () => {
  describe("what an entry carries", () => {
    // §5: a bare name cannot be chosen from confidently, which is the current
    // pickers' real defect. Every entry carries a mark, a name and the one
    // line that tells two of them apart.
    it("gives an NPC their occupation and where they are", () => {
      const [entry] = buildCandidates(["npc"], sources());
      expect(entry).toMatchObject({
        id: "thorin",
        name: "Thorin Oakenshield",
        kind: "npc",
      });
      expect(entry.line).toBe("King under the Mountain · Erebor");
    });

    it("gives a location its type and its parent", () => {
      const entries = buildCandidates(
        ["location"],
        sources({
          location: [
            location({ id: "dale", name: "Dale", type: "town", parentId: "erebor" }),
            location(),
          ],
        })
      );
      expect(entries.find((e) => e.id === "dale")!.line).toBe("Town · in Erebor");
    });

    it("gives a quest its status", () => {
      const [entry] = buildCandidates(["quest"], sources());
      expect(entry.line).toBe("Active");
    });

    it("gives a rumour its status, and says False rather than Disproved", () => {
      const entries = buildCandidates(
        ["rumor"],
        sources({ rumor: [rumor({ status: "false" }), rumor({ id: "r2", status: "confirmed" })] })
      );
      expect(entries.find((e) => e.id === "orcs-massing")!.line).toBe("False");
      expect(entries.find((e) => e.id === "r2")!.line).toBe("Confirmed");
    });

    it("names a rumour with no title by what was heard, as its own list does (DUP-001)", () => {
      const [entry] = buildCandidates(
        ["rumor"],
        sources({ rumor: [rumor({ title: "", content: "Traders saw a dragon near the bridge" })] })
      );
      expect(entry.name).toBe("Traders saw a dragon near the bridge");
    });

    it("finds an untitled rumour by the name it shows", () => {
      const entries = buildCandidates(
        ["rumor"],
        sources({ rumor: [rumor({ title: "", content: "Traders saw a dragon near the bridge" })] })
      );
      expect(filterCandidates(entries, "Traders")).toHaveLength(1);
    });

    it("never renders an id as a label", () => {
      // The quest card currently prints `bag-end` and `erebor` as if they were
      // labels. An unresolvable reference says nothing rather than leaking one.
      const [entry] = buildCandidates(
        ["npc"],
        sources({ npc: [npc({ locationId: "a-place-that-was-deleted" })] })
      );
      expect(entry.line).toBe("King under the Mountain");
      expect(entry.line).not.toContain("a-place-that-was-deleted");
      expect(entry.name).not.toContain("thorin");
    });

    it("shows free-text location as written, without looking it up as a place", () => {
      // T079: free text is what a player wrote. It used to be looked up as an
      // id, for documents written before `locationId`; production has none
      // left, so text that happens to match a place's id stays as written.
      const [entry] = buildCandidates(
        ["npc"],
        sources({
          npc: [npc({ locationId: undefined, location: "erebor" })],
          location: [location({ id: "erebor", name: "Erebor" })],
        })
      );
      expect(entry.line).toBe("King under the Mountain · erebor");
    });

    it("falls back to the free-text location when there is no id", () => {
      const [entry] = buildCandidates(
        ["npc"],
        sources({ npc: [npc({ locationId: undefined, location: "somewhere in Mirkwood" })] })
      );
      expect(entry.line).toBe("King under the Mountain · somewhere in Mirkwood");
    });

    it("leaves the line empty rather than inventing one", () => {
      const [entry] = buildCandidates(
        ["npc"],
        sources({ npc: [npc({ occupation: "", locationId: undefined, location: undefined })] })
      );
      expect(entry.line).toBe("");
    });
  });

  describe("order", () => {
    // §5: ordered by recently touched, not alphabetically. The entries you
    // attach mid-session are the ones the session has been about.
    it("puts the most recently touched first", () => {
      const entries = buildCandidates(
        ["npc"],
        sources({
          npc: [
            npc({ id: "a", name: "Aragorn", dateAdded: "2026-01-01T00:00:00.000Z" }),
            npc({ id: "b", name: "Balin", dateAdded: "2026-03-01T00:00:00.000Z" }),
            npc({ id: "c", name: "Cirdan", dateAdded: "2026-02-01T00:00:00.000Z" }),
          ],
        })
      );
      expect(entries.map((e) => e.id)).toEqual(["b", "c", "a"]);
    });

    it("prefers dateModified over dateAdded, because that is the touch", () => {
      const entries = buildCandidates(
        ["npc"],
        sources({
          npc: [
            npc({ id: "old-but-edited", dateAdded: "2026-01-01T00:00:00.000Z", dateModified: "2026-09-01T00:00:00.000Z" }),
            npc({ id: "new-untouched", dateAdded: "2026-05-01T00:00:00.000Z" }),
          ],
        })
      );
      expect(entries.map((e) => e.id)).toEqual(["old-but-edited", "new-untouched"]);
    });

    it("does not drop an entry that carries no date at all", () => {
      const entries = buildCandidates(
        ["npc"],
        sources({
          npc: [npc({ id: "dated" }), npc({ id: "undated", dateAdded: undefined })],
        })
      );
      expect(entries.map((e) => e.id).sort()).toEqual(["dated", "undated"]);
    });

    it("is not alphabetical", () => {
      const entries = buildCandidates(
        ["npc"],
        sources({
          npc: [
            npc({ id: "z", name: "Zzz", dateAdded: "2026-09-01T00:00:00.000Z" }),
            npc({ id: "a", name: "Aaa", dateAdded: "2026-01-01T00:00:00.000Z" }),
          ],
        })
      );
      expect(entries[0].name).toBe("Zzz");
    });
  });

  describe("already-attached entries", () => {
    it("marks what is attached rather than hiding it", () => {
      // Selection is immediate and reversible: a picked row shows as picked.
      const entries = buildCandidates(["npc"], sources(), { attached: attachRefs("npc", ["thorin"]) });
      expect(entries).toHaveLength(1);
      expect(entries[0].attached).toBe(true);
    });

    it("leaves everything else unattached", () => {
      const entries = buildCandidates(["npc"], sources(), { attached: attachRefs("npc", ["someone-else"]) });
      expect(entries[0].attached).toBe(false);
    });

    it("never offers the entity the tray is being filled from", () => {
      // A quest cannot relate to itself, and a location cannot be its own
      // parent -- offering it is how the cycle in PERF-11 becomes reachable.
      const entries = buildCandidates(["npc"], sources(), { exclude: attachRefs("npc", ["thorin"]) });
      expect(entries).toHaveLength(0);
    });
  });

  describe("an id names a record only together with its kind (DATA-008)", () => {
    // Every collection allocates its own slugs, so a place and a quest both
    // called "Watchtower" are both `watchtower`. That is legitimate data.
    const shared = () =>
      sources({
        npc: [npc({ id: "watchtower", name: "Watchtower Warden" })],
        location: [location({ id: "watchtower", name: "Watchtower" })],
        quest: [quest({ id: "watchtower", title: "Hold the Watchtower" })],
        rumor: [rumor({ id: "watchtower", title: "Lights in the Watchtower" })],
      });
    const ALL: AttachKind[] = ["npc", "location", "quest", "rumor"];

    it("marks only the attached kind, not every record sharing its id", () => {
      const entries = buildCandidates(ALL, shared(), {
        attached: attachRefs("location", ["watchtower"]),
      });
      const attached = entries.filter((e) => e.attached).map((e) => e.kind);
      expect(attached).toEqual(["location"]);
    });

    it("excludes only the excluded kind", () => {
      const entries = buildCandidates(ALL, shared(), {
        exclude: attachRefs("npc", ["watchtower"]),
      });
      expect(entries.map((e) => e.kind).sort()).toEqual(["location", "quest", "rumor"]);
    });

    it("builds references from optional ids, dropping the empty ones", () => {
      expect(attachRefs("location", ["erebor", undefined, "", null])).toEqual([
        { kind: "location", id: "erebor" },
      ]);
    });
  });

  describe("spanning several kinds", () => {
    it("offers every kind asked for, and only those", () => {
      const entries = buildCandidates(["npc", "location"], sources());
      expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(["npc", "location"]));
    });

    it("groups them under the labels the NPC page already displays", () => {
      const groups = groupCandidates(buildCandidates(["npc", "location", "quest", "rumor"], sources()));
      expect(groups.map((g) => g.label)).toEqual(["People", "Places", "Quests", "Rumors"]);
    });

    it("drops a group with nothing in it", () => {
      const groups = groupCandidates(buildCandidates(["npc", "quest"], sources({ quest: [] })));
      expect(groups.map((g) => g.label)).toEqual(["People"]);
    });

    it("names every kind it can offer", () => {
      expect(ATTACH_KIND_LABELS).toEqual({
        npc: "People",
        location: "Places",
        quest: "Quests",
        rumor: "Rumors",
      });
    });
  });

  describe("the filter box, which is an accelerator and not a typeahead", () => {
    const entries = () =>
      buildCandidates(
        ["npc"],
        sources({
          npc: [
            npc({ id: "thorin", name: "Thorin Oakenshield", occupation: "King under the Mountain" }),
            npc({ id: "balin", name: "Balin", occupation: "Scribe" }),
          ],
        })
      );

    it("returns everything when nothing is typed", () => {
      expect(filterCandidates(entries(), "")).toHaveLength(2);
      expect(filterCandidates(entries(), "   ")).toHaveLength(2);
    });

    it("matches on the name", () => {
      expect(filterCandidates(entries(), "bal").map((e) => e.id)).toEqual(["balin"]);
    });

    it("matches on the disambiguating line too", () => {
      expect(filterCandidates(entries(), "scribe").map((e) => e.id)).toEqual(["balin"]);
    });

    it("ignores case", () => {
      expect(filterCandidates(entries(), "THORIN").map((e) => e.id)).toEqual(["thorin"]);
    });

    it("never matches on an id, which is not shown and cannot be typed on purpose", () => {
      const list = buildCandidates(
        ["npc"],
        sources({ npc: [npc({ id: "zzz-internal-id", name: "Thorin", occupation: "" })] })
      );
      expect(filterCandidates(list, "zzz-internal")).toHaveLength(0);
    });
  });

  describe("copy", () => {
    it("phrases the escape hatch for the kind, since 'no such person' is wrong for a place", () => {
      expect(ATTACH_KIND_NEW_LABELS.npc).toBe("No such person yet — add one");
      expect(ATTACH_KIND_NEW_LABELS.location).toBe("No such place yet — add one");
      expect(ATTACH_KIND_NEW_LABELS.quest).toBe("No such quest yet — add one");
      expect(ATTACH_KIND_NEW_LABELS.rumor).toBe("No such rumor yet — add one");
    });

    it("gives an empty collection something designed to say", () => {
      (Object.keys(ATTACH_KIND_EMPTY_LABELS) as AttachKind[]).forEach((kind) => {
        expect(ATTACH_KIND_EMPTY_LABELS[kind]).toMatch(/\w/);
      });
    });

    it("never says False about a rumour, anywhere in the tray's copy", () => {
      const allCopy = [
        ...Object.values(ATTACH_KIND_LABELS),
        ...Object.values(ATTACH_KIND_NEW_LABELS),
        ...Object.values(ATTACH_KIND_EMPTY_LABELS),
      ].join(" ");
      expect(allCopy).not.toMatch(/False/);
    });
  });
});
