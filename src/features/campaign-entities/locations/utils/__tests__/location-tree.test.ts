// src/features/campaign-entities/locations/utils/__tests__/location-tree.test.ts
import {
  ancestorPathOf,
  buildLocationIndex,
  childrenOf,
  descendantIdsDeepestFirst,
  descendantIdsOf,
  insideCountOf,
  invalidParentIdsFor,
  pathLabelOf,
  siblingsOf,
  wouldCreateCycle,
} from '../location-tree';
import { Location } from '../../types';

const place = (id: string, name: string, parentId?: string): Location =>
  ({
    id,
    name,
    type: 'city',
    status: 'known',
    description: '',
    parentId,
  } as Location);

/**
 * Beleriand holds Gondolin, which holds King's square and Seven gates; Doriath
 * is Gondolin's sibling, and Angband stands on its own. Four levels deep, which
 * is what the depth-4 gate needs.
 */
const beleriand = place('beleriand', 'Beleriand');
const gondolin = place('gondolin', 'Gondolin', 'beleriand');
const kingsSquare = place('kings-square', "King's square", 'gondolin');
const sevenGates = place('seven-gates', 'Seven gates', 'gondolin');
const fountain = place('fountain', 'The fountain', 'kings-square');
const doriath = place('doriath', 'Doriath', 'beleriand');
const angband = place('angband', 'Angband');

const TREE = [beleriand, gondolin, kingsSquare, sevenGates, fountain, doriath, angband];

describe('buildLocationIndex', () => {
  it('separates roots, children and dangling references', () => {
    // A `parentId` naming nothing loaded is a dangling reference, not a root:
    // promoting it to the top level would hide the broken link (#303).
    const lost = place('lost', 'Lost city', 'atlantis');
    const index = buildLocationIndex([...TREE, lost]);

    expect(index.roots.map((l) => l.id)).toEqual(['beleriand', 'angband']);
    expect(index.orphans.map((l) => l.id)).toEqual(['lost']);
    expect(childrenOf(index, 'beleriand').map((l) => l.id)).toEqual([
      'gondolin',
      'doriath',
    ]);
  });

  it("treats '' and undefined as the same absence of a parent", () => {
    // The form and quick add both write '' because Firestore rejects
    // `undefined`, so "no parent" genuinely has two spellings in the data.
    const index = buildLocationIndex([
      place('a', 'A', ''),
      place('b', 'B', undefined),
    ]);
    expect(index.roots.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('does not let a location called "root" adopt the top level', () => {
    // The hierarchy map this replaces keyed its buckets by parentId with
    // 'root' as the sentinel for "no parent", so a real location with that id
    // silently collected every root as its children.
    const index = buildLocationIndex([
      place('root', 'Root Cellar'),
      place('other', 'Somewhere else'),
    ]);
    expect(childrenOf(index, 'root')).toEqual([]);
    expect(index.roots).toHaveLength(2);
  });
});

describe('ancestorPathOf', () => {
  it('reads outermost first, as a breadcrumb does', () => {
    expect(ancestorPathOf(TREE, 'fountain').map((l) => l.name)).toEqual([
      'Beleriand',
      'Gondolin',
      "King's square",
    ]);
  });

  it('is empty for a root', () => {
    expect(ancestorPathOf(TREE, 'angband')).toEqual([]);
  });

  it('drops an ancestor id that names nothing loaded', () => {
    // The walk reports the dangling id, because that is what the record says.
    // The breadcrumb is a list of places you can open, and that is not one.
    const lost = place('lost', 'Lost city', 'atlantis');
    expect(ancestorPathOf([...TREE, lost], 'lost')).toEqual([]);
  });
});

describe('descendantIdsOf', () => {
  it('collects every level below, not just the first', () => {
    expect(descendantIdsOf(TREE, 'beleriand').sort()).toEqual(
      ['doriath', 'fountain', 'gondolin', 'kings-square', 'seven-gates'].sort()
    );
  });

  it('is empty for a leaf', () => {
    expect(descendantIdsOf(TREE, 'seven-gates')).toEqual([]);
  });
});

describe('descendantIdsDeepestFirst', () => {
  it('puts every child ahead of its own parent, which is what a delete needs', () => {
    expect(descendantIdsDeepestFirst(TREE, 'beleriand')).toEqual([
      'fountain',
      'kings-square',
      'seven-gates',
      'gondolin',
      'doriath',
    ]);
  });

  it('terminates inside a cycle', () => {
    const a = place('a', 'A', 'b');
    const b = place('b', 'B', 'a');
    expect(descendantIdsDeepestFirst([a, b], 'a')).toEqual(['b']);
  });
});

describe('siblingsOf', () => {
  it('names the others under the same parent, never the location itself', () => {
    expect(siblingsOf(TREE, 'gondolin').map((l) => l.id)).toEqual(['doriath']);
  });

  it("treats the top level as a family, so a root has siblings too", () => {
    expect(siblingsOf(TREE, 'beleriand').map((l) => l.id)).toEqual(['angband']);
  });
});

describe('the cycle guard (PERF-11 / T033, and 15-4 item 5)', () => {
  /**
   * Two places each claiming to be inside the other. Unreachable before this
   * PR -- nothing in the product could choose a parent -- and reachable from
   * `Move elsewhere` the moment it ships, which is why the guard ships with it.
   *
   * Every assertion in this block is really an assertion that the call
   * *returns*. Remove a visited set and the suite hangs rather than failing,
   * which is the honest signature of the defect.
   */
  const a = place('a', 'A', 'b');
  const b = place('b', 'B', 'a');
  const inner = place('inner', 'Inner', 'a');
  const CYCLE = [a, b, inner];

  it('terminates when climbing out of a cycle', () => {
    expect(() => ancestorPathOf(CYCLE, 'inner')).not.toThrow();
    expect(ancestorPathOf(CYCLE, 'inner').length).toBeLessThanOrEqual(64);
  });

  it('never names the same place twice in a breadcrumb', () => {
    // The walk reports the edge that closed the cycle, deliberately. A
    // breadcrumb reading "A > B > A > here" states a containment that cannot
    // be true, so the path drops the repeat.
    expect(ancestorPathOf(CYCLE, 'inner').map((l) => l.id)).toEqual(['b', 'a']);
  });

  it('terminates when descending into one', () => {
    const descendants = descendantIdsOf(CYCLE, 'a');
    expect(descendants).toContain('inner');
    // Each node is visited once, however many edges lead back to it.
    expect(new Set(descendants).size).toBe(descendants.length);
  });

  it('terminates on a location that is its own parent', () => {
    const self = place('self', 'Self', 'self');
    expect(descendantIdsOf([self], 'self')).toEqual([]);
    expect(ancestorPathOf([self], 'self')).toEqual([]);
  });

  it('stops a pathologically deep chain even without a cycle', () => {
    // A visited set stops a cycle; the cap stops the other way a walk hangs.
    const chain = Array.from({ length: 500 }, (_, i) =>
      place(`n${i}`, `N${i}`, i === 0 ? undefined : `n${i - 1}`)
    );
    expect(ancestorPathOf(chain, 'n499').length).toBeLessThanOrEqual(64);
    expect(descendantIdsOf(chain, 'n0').length).toBeLessThanOrEqual(64);
  });
});

describe('invalidParentIdsFor', () => {
  it('excludes the location itself and everything inside it', () => {
    expect(invalidParentIdsFor(TREE, 'gondolin').sort()).toEqual(
      ['fountain', 'gondolin', 'kings-square', 'seven-gates'].sort()
    );
  });

  it('leaves a sibling and an ancestor offerable', () => {
    const invalid = invalidParentIdsFor(TREE, 'gondolin');
    expect(invalid).not.toContain('doriath');
    expect(invalid).not.toContain('beleriand');
    expect(invalid).not.toContain('angband');
  });
});

describe('wouldCreateCycle', () => {
  it('refuses a location as its own parent', () => {
    expect(wouldCreateCycle(TREE, 'gondolin', 'gondolin')).toBe(true);
  });

  it('refuses a descendant, at any depth', () => {
    expect(wouldCreateCycle(TREE, 'beleriand', 'fountain')).toBe(true);
  });

  it('allows a sibling, an ancestor and the top level', () => {
    expect(wouldCreateCycle(TREE, 'gondolin', 'doriath')).toBe(false);
    expect(wouldCreateCycle(TREE, 'kings-square', 'beleriand')).toBe(false);
    expect(wouldCreateCycle(TREE, 'gondolin', undefined)).toBe(false);
    expect(wouldCreateCycle(TREE, 'gondolin', '')).toBe(false);
  });
});

describe('what a row and a band say about the tree', () => {
  it('counts only what is directly inside', () => {
    const index = buildLocationIndex(TREE);
    expect(insideCountOf(index, 'beleriand')).toBe(2);
    expect(insideCountOf(index, 'gondolin')).toBe(2);
    expect(insideCountOf(index, 'doriath')).toBe(0);
  });

  it('labels a search hit with the path that makes it legible', () => {
    expect(pathLabelOf(TREE, 'fountain')).toBe("Beleriand · Gondolin · King's square");
    expect(pathLabelOf(TREE, 'angband')).toBe('');
  });
});
