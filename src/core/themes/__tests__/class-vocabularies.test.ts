// src/core/themes/__tests__/class-vocabularies.test.ts
//
// The general half of T042: a theme class selected by **data**.
//
// `ladder-classes.test.ts` gates the one instance that shipped broken. The
// pattern it came from is wider: a component takes a value from a closed
// vocabulary -- a prop typed as a union -- and turns it into a class name the
// stylesheet is trusted to define. Neither direction of
// `css-class-manifest.test.ts` reaches that. A name that only exists after
// assembly is never a whole word in the source, and a name no stylesheet
// defines is not something the manifest looks for.
//
// Three components select their paint this way, and each is checked for the
// one property that matters: every value its vocabulary can take lands on a
// rule that exists.
//
// - `Button`'s `variant` -> `button-${variant}`
// - `RosterStatus`'s `tone` -> the class `STATUS_TONE` maps it to
// - `EntitySigil`'s index -> `.entity-sigil[data-sigil-index="n"]`
//
// Each vocabulary is read from the component's own source, not restated here,
// so adding a variant, a tone or a bucket is checked without anyone
// remembering to update this file. The price is that each reader parses one
// declaration by pattern; each test asserts its reader found something, so a
// reshaped declaration fails loudly instead of checking an empty list.

import * as fs from "fs";
import * as path from "path";
import { SIGIL_BUCKET_COUNT } from "core/utils/entity-sigil";

const CSS_DIR = path.join(__dirname, "..", "css");
const SRC_DIR = path.join(__dirname, "..", "..", "..");
const COMPONENTS_DIR = path.join(SRC_DIR, "core", "components");

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Every selector the theme stylesheets declare, comments removed. */
const selectors = (): string[] =>
  fs
    .readdirSync(CSS_DIR)
    .filter((f) => f.endsWith(".css"))
    .flatMap((f) => {
      const source = stripComments(fs.readFileSync(path.join(CSS_DIR, f), "utf8"));
      return [...source.matchAll(/([^{}]+)\{/g)].flatMap((block) =>
        block[1].split(",").map((s) => s.trim())
      );
    });

/** Every class name the theme stylesheets define. */
const definedClasses = (): Set<string> =>
  new Set(
    selectors().flatMap((s) =>
      [...s.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map((m) => m[1])
    )
  );

const componentSource = (file: string): string =>
  stripComments(fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf8"));

/** The quoted members of a string-literal union: `type Name = 'a' | 'b'`. */
const unionMembers = (source: string, typeName: string): string[] => {
  const declaration = source.match(
    new RegExp(`type\\s+${typeName}\\s*=([^;]+);`)
  );
  if (!declaration) return [];
  return [...declaration[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
};

describe("a theme class selected by data (T042)", () => {
  const defined = definedClasses();

  describe("Button's variant", () => {
    const variants = unionMembers(componentSource("Button.tsx"), "ButtonVariant");

    it("is read from `ButtonVariant`", () => {
      expect(variants.length).toBeGreaterThan(0);
    });

    it("names a stylesheet class for every value", () => {
      const missing = variants
        .map((v) => `button-${v}`)
        .filter((cls) => !defined.has(cls));

      expect(missing).toEqual([]);
    });

    it("and every `.button-*` rule is a variant or applied by name", () => {
      // The reverse, which closes the hole `css-class-manifest.test.ts`
      // admits: it exempts the whole `button-` prefix, so a misspelt rule
      // such as `.button-outlien` would pass there. Here a `button-` class
      // must be a member of the union -- or, like `button-danger`, a class a
      // consumer spells out whole, which the manifest already checks.
      const consumers = fs
        .readdirSync(SRC_DIR, { recursive: true, encoding: "utf8" })
        .filter((f) => /\.tsx?$/.test(f) && !/__tests__|\.test\.tsx?$/.test(f))
        .map((f) => fs.readFileSync(path.join(SRC_DIR, f), "utf8"))
        .join("\n");

      const orphaned = [...defined]
        .filter((cls) => cls.startsWith("button-"))
        .filter((cls) => !variants.includes(cls.slice("button-".length)))
        .filter((cls) => !new RegExp(`\\b${cls}\\b`).test(consumers))
        .sort();

      expect(orphaned).toEqual([]);
    });
  });

  describe("RosterStatus's tone", () => {
    const source = componentSource("Roster.tsx");
    const table = source.match(
      /const\s+STATUS_TONE\s*:\s*Record<RosterStatusTone,\s*string>\s*=\s*\{([^}]+)\}/
    );
    // TypeScript already holds the keys to `RosterStatusTone`: a `Record`
    // over the union must name every member. What it cannot check is the
    // value, which is only a string.
    const classes = table
      ? [...table[1].matchAll(/:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
      : [];

    it("is read from `STATUS_TONE`", () => {
      expect(classes.length).toBe(unionMembers(source, "RosterStatusTone").length);
      expect(classes.length).toBeGreaterThan(0);
    });

    it("maps every tone to a stylesheet class", () => {
      expect(classes.filter((cls) => !defined.has(cls))).toEqual([]);
    });
  });

  describe("EntitySigil's index", () => {
    it("has a rule for every bucket `sigilIndexFor` can return", () => {
      // The hue is chosen by an attribute rather than a class, so the
      // selector itself is what must exist. Raising `SIGIL_BUCKET_COUNT`
      // without adding its rule would leave those entities with no fill.
      const declared = new Set(selectors());
      const missing = Array.from(
        { length: SIGIL_BUCKET_COUNT },
        (_, i) => `.entity-sigil[data-sigil-index="${i}"]`
      ).filter((selector) => !declared.has(selector));

      expect(SIGIL_BUCKET_COUNT).toBeGreaterThan(0);
      expect(missing).toEqual([]);
    });
  });
});
