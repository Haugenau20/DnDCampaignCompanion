// src/core/themes/__tests__/schema-fixture.test.ts
// The contract between the design source of truth and the code.
//
// `docs/design/colour-schema.json` is generated from the contract in
// `colour-schema.md` and is **never edited by an implementation PR**. That is
// not ceremony: this file compares generated themes to a fixture, and a fixture
// written by the same agent that wrote the generator compares the
// implementation to itself and passes by construction. Independent authorship
// is the fixture's entire job.
//
// So when this test fails, the answer is never to edit the JSON and never to
// hand-correct a theme value. It is that the contract is wrong -- raise it,
// take a corrected schema, regenerate both modes together.

import fs from "fs";
import path from "path";
import { deriveTokens, contrastRatio } from "../derive";
import { ThemeName, ThemeTokens } from "../types";

const SCHEMA_PATH = path.resolve(
  __dirname,
  "../../../../docs/design/colour-schema.json"
);

interface Schema {
  version: number;
  leafCount: number;
  /** Section 5.4's role map, including which PR each legacy name retires in. */
  roles: Record<string, { retire?: string }>;
  resolved: Record<ThemeName, { tree: Record<string, string> }>;
}

const schema: Schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));

/**
 * The token tree as the fixture spells it: dotted paths, arrays indexed.
 *
 * Deliberately not `flattenTokens` from `token-variables.ts`. That produces CSS
 * variable names, and comparing through a second transformation would let a
 * bug in the name derivation hide a bug in a value, or the reverse.
 */
const flatten = (node: unknown, trail: string[] = []): Record<string, string> => {
  if (typeof node === "string") return { [trail.join(".")]: node };
  if (Array.isArray(node)) {
    return Object.assign(
      {},
      ...node.map((entry, index) => flatten(entry, [...trail, String(index)]))
    );
  }
  return Object.assign(
    {},
    ...Object.entries(node as Record<string, unknown>).map(([key, value]) =>
      flatten(value, [...trail, key])
    )
  );
};

/**
 * The retirements that have actually landed in this branch.
 *
 * The fixture's `tree` is the token set as of 12-2b, and section 5.4 marks
 * twelve of those names "Retired 12-3a" or "Retired 12-3b" -- they resolve in
 * the fixture so that no commit is ever broken, and go with their consumers.
 * So once a migration lands, the generated tree is deliberately *smaller* than
 * the fixture's, and the comparison has to say so.
 *
 * Naming the landed phases is the whole of what this file states on its own
 * authority, and it is one line a reviewer checks against the branch. Which
 * *tokens* each phase retires still comes from the schema, so a token cannot
 * be dropped here without the schema having said it could -- the alternative,
 * hardcoding a new leaf count, would let any deletion through as long as the
 * total happened to match.
 */
const LANDED: readonly string[] = ["12-3a", "12-3b"];

const MODES: readonly ThemeName[] = ["light", "dark"];

describe("generated themes equal the schema fixture", () => {
  /** Token paths the schema says are gone once `LANDED` has landed. */
  const retired = new Set(
    Object.entries(schema.roles)
      .filter(([, role]) => role.retire !== undefined && LANDED.includes(role.retire))
      .map(([token]) => token)
  );

  test("the fixture is the version this generator was written against", () => {
    expect(schema.version).toBe(9);
    expect(schema.leafCount).toBe(143);
  });

  test("every landed retirement names tokens the schema actually marked", () => {
    // Guards the mechanism above rather than the tree: a typo in `LANDED`
    // would silently retire nothing and the comparison would then fail with a
    // confusing diff instead of this.
    const tagged = new Set(
      Object.values(schema.roles)
        .map((role) => role.retire)
        .filter((tag): tag is string => tag !== undefined)
    );
    expect({ landed: LANDED.filter((p) => !tagged.has(p)), retiredCount: retired.size }).toEqual({
      landed: [],
      retiredCount: 12,
    });
  });

  describe.each(MODES)("%s", (mode) => {
    const generated = flatten(deriveTokens(mode) as unknown as Record<string, unknown>);
    const expected = Object.fromEntries(
      Object.entries(schema.resolved[mode].tree).filter(([token]) => !retired.has(token))
    );

    /*
     * A plain equality over the whole tree, in both directions.
     *
     * This used to carry an `additions` block naming 12-2's six colours and
     * two cues as exceptions, because the fixture predated them. The schema
     * now carries all 135 leaves in `resolved.<mode>.tree`, so the exception
     * is gone -- which matters beyond tidiness. A correct workaround that
     * outlives its reason becomes a second source of truth, and this one was
     * load-bearing: any token the generator invented would have been waved
     * through if someone added it to the block instead of to the schema.
     */
    test("the generated token set is exactly the fixture's, no more and no less", () => {
      expect(Object.keys(generated).sort()).toEqual(Object.keys(expected).sort());
    });

    test("nothing the schema retired survives as a shim", () => {
      // Retired means deleted, not aliased. An alias is a second way to say
      // what a pair already says, it outlives the migration it was meant to
      // enable, and grep cannot tell it from an intentional reference.
      expect([...retired].filter((token) => token in generated)).toEqual([]);
    });

    test("every leaf the fixture still expects matches exactly", () => {
      // One assertion over the whole tree rather than one per leaf: a diff of
      // the two objects names every wrong value at once, which is what you want
      // when a contract change moves fifty of them.
      expect(generated).toEqual(expected);
    });

    test("the knowledge ladder is monotonic in contrast against every content ground", () => {
      // Schema gate 6. The ladder means "more knowledge", so it has to *read*
      // as more in both modes -- darker in light, lighter in dark -- and that
      // is a property of the ordering, which no per-token threshold can check.
      const grounds = [
        generated["surface.page.bg"],
        generated["surface.card.bg"],
        generated["surface.sunken.bg"],
      ];
      const ratios = [0, 1, 2].map((i) =>
        Math.min(...grounds.map((g) => contrastRatio(generated[`knowledge.${i}`], g)))
      );
      expect({
        ratios: ratios.map((r) => Math.round(r * 100) / 100),
        rising: ratios[0] < ratios[1] && ratios[1] < ratios[2],
      }).toEqual({
        ratios: ratios.map((r) => Math.round(r * 100) / 100),
        rising: true,
      });
    });
  });
});

describe("the theme files author nothing", () => {
  const definitions = ["lightTheme.ts", "darkTheme.ts"];

  test.each(definitions)("%s contains no hex literal", (file) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../definitions", file),
      "utf8"
    );
    expect(source.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

describe("the generator refuses a broken contract", () => {
  // The borrowed-role verification is part of generation, not review. These pin
  // that it can actually fail -- a check that has never been seen to fail is
  // indistinguishable from one that cannot.
  test("a borrowed ink below AA stops generation", async () => {
    const { verifyBorrowedRoles } = await import("../derive");
    const tokens = deriveTokens("light");
    const broken: ThemeTokens = {
      ...tokens,
      danger: { ...tokens.danger, deleteText: tokens.surface.page.bg },
    };
    expect(() => verifyBorrowedRoles(broken)).toThrow(/danger\.deleteText/);
  });

  test("an intact tree passes", () => {
    expect(() => deriveTokens("dark")).not.toThrow();
  });
});
