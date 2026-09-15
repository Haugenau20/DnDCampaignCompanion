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

const MODES: readonly ThemeName[] = ["light", "dark"];

describe("generated themes equal the schema fixture", () => {
  test("the fixture is the version this generator was written against", () => {
    expect(schema.version).toBe(6);
    expect(schema.leafCount).toBe(135);
  });

  describe.each(MODES)("%s", (mode) => {
    const generated = flatten(deriveTokens(mode) as unknown as Record<string, unknown>);
    const expected = schema.resolved[mode].tree;

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

    test("all 135 leaves of the fixture's tree match exactly", () => {
      // One assertion over the whole tree rather than 135 assertions: a diff of
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
