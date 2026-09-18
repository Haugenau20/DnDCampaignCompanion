// src/shared/hooks/__tests__/highlightTarget.test.ts
import {
  ancestorIdsOf,
  resolveHighlightTarget,
  HIGHLIGHT_DEPTH_CAP,
} from "../useHighlightTarget";

interface Node {
  id: string;
  name: string;
  parentId?: string;
}

const tree: Node[] = [
  { id: "beleriand", name: "Beleriand" },
  { id: "gondolin", name: "Gondolin", parentId: "beleriand" },
  { id: "kings-square", name: "King's Square", parentId: "gondolin" },
  { id: "seven-gates", name: "Seven Gates", parentId: "gondolin" },
  { id: "orphan", name: "Orphan", parentId: "a-parent-that-was-deleted" },
];

const idOf = (node: Node) => node.id;
const parentIdOf = (node: Node) => node.parentId;

describe("ancestorIdsOf", () => {
  it("walks from a leaf to the root", () => {
    expect(ancestorIdsOf(tree, "kings-square", { idOf, parentIdOf })).toEqual([
      "gondolin",
      "beleriand",
    ]);
  });

  it("returns nothing for a root", () => {
    expect(ancestorIdsOf(tree, "beleriand", { idOf, parentIdOf })).toEqual([]);
  });

  it("stops at a parent that no longer exists rather than throwing", () => {
    expect(ancestorIdsOf(tree, "orphan", { idOf, parentIdOf })).toEqual([
      "a-parent-that-was-deleted",
    ]);
  });

  it("returns nothing for an id that is not in the collection", () => {
    expect(ancestorIdsOf(tree, "nowhere", { idOf, parentIdOf })).toEqual([]);
  });

  describe("cycle safety -- PERF-11 / T033", () => {
    // `LocationDirectory`'s parent walk used repeated `locations.find` with no
    // visited set, so a node inside a parent cycle never terminated. This is
    // asserted, not eyeballed: the test hangs the suite if the guard is gone.
    it("terminates on a two-node cycle", () => {
      const cyclic: Node[] = [
        { id: "a", name: "A", parentId: "b" },
        { id: "b", name: "B", parentId: "a" },
      ];
      expect(ancestorIdsOf(cyclic, "a", { idOf, parentIdOf })).toEqual(["b", "a"]);
    });

    it("terminates on a node that is its own parent", () => {
      const selfCycle: Node[] = [{ id: "a", name: "A", parentId: "a" }];
      expect(ancestorIdsOf(selfCycle, "a", { idOf, parentIdOf })).toEqual(["a"]);
    });

    it("terminates on a long cycle", () => {
      const ring: Node[] = Array.from({ length: 50 }, (_, i) => ({
        id: `n${i}`,
        name: `N${i}`,
        parentId: `n${(i + 1) % 50}`,
      }));
      const walked = ancestorIdsOf(ring, "n0", { idOf, parentIdOf });
      expect(walked).toHaveLength(50);
      expect(new Set(walked).size).toBe(50);
    });

    it("never visits the same node twice", () => {
      const cyclic: Node[] = [
        { id: "a", name: "A", parentId: "b" },
        { id: "b", name: "B", parentId: "c" },
        { id: "c", name: "C", parentId: "a" },
      ];
      const walked = ancestorIdsOf(cyclic, "a", { idOf, parentIdOf });
      expect(new Set(walked).size).toBe(walked.length);
    });
  });

  describe("the depth cap", () => {
    it("stops at the cap even on a chain with no cycle", () => {
      // A cycle is not the only way to hang: a pathologically deep chain is a
      // second one, so the walk is bounded as well as guarded.
      const deep: Node[] = Array.from({ length: HIGHLIGHT_DEPTH_CAP + 20 }, (_, i) => ({
        id: `n${i}`,
        name: `N${i}`,
        parentId: i === 0 ? undefined : `n${i - 1}`,
      }));
      const walked = ancestorIdsOf(deep, `n${HIGHLIGHT_DEPTH_CAP + 19}`, { idOf, parentIdOf });
      expect(walked).toHaveLength(HIGHLIGHT_DEPTH_CAP);
    });

    it("caps deep enough that no real campaign hits it", () => {
      expect(HIGHLIGHT_DEPTH_CAP).toBeGreaterThanOrEqual(32);
    });
  });

  it("is a no-op for a flat collection with no parent accessor", () => {
    expect(ancestorIdsOf(tree, "gondolin", { idOf })).toEqual([]);
  });
});

describe("resolveHighlightTarget", () => {
  // T014's contract, from `00-entity-authoring.md` §9.
  it("matches by id", () => {
    const target = resolveHighlightTarget(tree, "gondolin", { idOf, parentIdOf });
    expect(target.highlightedId).toBe("gondolin");
  });

  it("does NOT match by name", () => {
    // Two of the four directories matched `?highlight=` against the name as
    // well as the id. Names do not survive a rename; ids do. Dropping it is a
    // behavioural change recorded on T014.
    const target = resolveHighlightTarget(tree, "Gondolin", { idOf, parentIdOf });
    expect(target.highlightedId).toBeNull();
  });

  it("is case-sensitive, because an id is", () => {
    expect(resolveHighlightTarget(tree, "GONDOLIN", { idOf, parentIdOf }).highlightedId).toBeNull();
  });

  it("reveals the target and every ancestor needed to see it", () => {
    const target = resolveHighlightTarget(tree, "kings-square", { idOf, parentIdOf });
    expect(target.idsToReveal).toEqual(["kings-square", "gondolin", "beleriand"]);
  });

  it("reveals only the target in a flat collection", () => {
    const target = resolveHighlightTarget(tree, "gondolin", { idOf });
    expect(target.idsToReveal).toEqual(["gondolin"]);
  });

  it("resolves to nothing when the parameter is absent", () => {
    const target = resolveHighlightTarget(tree, null, { idOf, parentIdOf });
    expect(target.highlightedId).toBeNull();
    expect(target.idsToReveal).toEqual([]);
  });

  it("resolves to nothing when the id names no record", () => {
    const target = resolveHighlightTarget(tree, "deleted-long-ago", { idOf, parentIdOf });
    expect(target.highlightedId).toBeNull();
    expect(target.idsToReveal).toEqual([]);
  });

  it("terminates when the target sits inside a parent cycle", () => {
    const cyclic: Node[] = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    const target = resolveHighlightTarget(cyclic, "a", { idOf, parentIdOf });
    expect(target.highlightedId).toBe("a");
    expect(target.idsToReveal).toEqual(["a", "b"]);
  });
});
