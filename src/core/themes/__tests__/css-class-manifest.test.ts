// src/core/themes/__tests__/css-class-manifest.test.ts
// Every class the theme stylesheets define must be one the application applies.
//
// The mirror of `token-manifest.test.ts`, one level up. That suite walks
// variables in both directions -- consumed-but-undefined, which is what a
// rename breaks, and defined-but-unconsumed, which is what R72 found had been
// accumulating unwatched. Classes have the same two directions and, until now,
// neither was checked: a class whose consumer is deleted keeps its rules, keeps
// its `var()` references, and keeps every gate in this project green.
//
// That is not hypothetical. R73 recorded eight classes believed dead; when the
// list was measured three of them were alive, and the remaining five had been
// dead long enough that nobody could say which change orphaned them. The cost
// of finding them was a human reading a diff.
//
// What this cannot prove, stated so it is not mistaken for a guarantee:
//
// - That a class which *is* applied is applied to the right element. This is a
//   reachability check, not a correctness one.
// - That a class assembled from a template is spelled correctly. `PREFIXES`
//   below exempts one pattern by prefix, so `.button-outlien` would pass. A
//   prefix exemption is the same trade `FOREIGN_PREFIXES` makes in the token
//   manifest: it buys coverage of the ordinary case at the price of the
//   assembled one. Narrowing it means duplicating each consumer's union type
//   here, where it would drift.
// - Anything about `src/styles/globals.css`. Its four classes are Tailwind-
//   shaped utilities rather than design-system surfaces, and they are applied
//   the same way from anywhere. Out of scope deliberately, not by oversight.

import * as fs from "fs";
import * as path from "path";

const CSS_DIR = path.join(__dirname, "..", "css");
const SRC_DIR = path.join(__dirname, "..", "..", "..");

/**
 * Class names the application assembles at runtime, and the expression that
 * assembles each one.
 *
 * A class reached only through a template literal never appears in the source
 * as a whole word, so a scan for its name finds nothing and reports it dead.
 *
 * There is exactly one, which is worth stating because the first draft of this
 * list had six. A grep for the backtick form over-collects badly: it finds
 * React keys (`affiliation-${affiliation}` names a list item, not a class) and
 * it finds prose, since three directories carry a comment explaining that they
 * spell their status classes out *rather than* building
 * `npc-status-${status}`. Neither is a consumer. The second test below is what
 * exposed all five, by failing on prefixes that matched no class at all --
 * R73's lesson arriving one level up from where it was learned.
 *
 * `typography-*` and `progress-bar-*` are likewise written as whole literals,
 * so the ordinary scan reaches them and they need no exemption here.
 */
const PREFIXES: Readonly<Record<string, string>> = {
  "button-": "`button-${variant}` in core/components/Button.tsx.",
};

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "");

const themeStylesheets = (): string[] =>
  fs
    .readdirSync(CSS_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(CSS_DIR, f));

/**
 * Every class name the theme stylesheets define.
 *
 * Read from selector text only -- the run before each `{` -- so that a class
 * name appearing inside a declaration (`content: ".foo"`) is not mistaken for
 * a definition. At-rule preludes come through the same path and contribute
 * nothing, since none of them carries a class.
 */
const definedClasses = (): Set<string> => {
  const out = new Set<string>();
  themeStylesheets().forEach((file) => {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const block of source.matchAll(/([^{}]+)\{/g)) {
      for (const cls of block[1].matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) {
        out.add(cls[1]);
      }
    }
  });
  return out;
};

/** Application sources that can apply a class. Tests are not consumers. */
const consumerFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "node_modules") return;
        walk(full);
        return;
      }
      if (!/\.tsx?$/.test(entry.name)) return;
      if (/\.test\.tsx?$/.test(entry.name)) return;
      out.push(full);
    });
  };
  walk(SRC_DIR);
  return out;
};

const consumerSource = (): string =>
  consumerFiles()
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");

const isAssembled = (cls: string): boolean =>
  Object.keys(PREFIXES).some((p) => cls.startsWith(p));

describe("css class manifest", () => {
  test("finds stylesheets and consumers to scan", () => {
    expect(themeStylesheets().length).toBeGreaterThan(0);
    expect(consumerFiles().length).toBeGreaterThan(100);
    expect(definedClasses().size).toBeGreaterThan(50);
  });

  test("every class a theme stylesheet defines is applied somewhere", () => {
    const source = consumerSource();
    const dead = [...definedClasses()]
      .filter((cls) => !isAssembled(cls))
      .filter((cls) => !new RegExp(`\\b${cls}\\b`).test(source))
      .sort();

    expect(dead).toEqual([]);
  });

  test("and every declared prefix still matches a class that exists", () => {
    // The half that keeps the exemption list honest, exactly as the token
    // manifest's unused list is checked both ways. Without it a prefix outlives
    // the classes it covered and silently excuses the next class to share its
    // name -- which is how an exemption stops describing anything.
    const defined = [...definedClasses()];
    const stale = Object.keys(PREFIXES)
      .filter((p) => !defined.some((cls) => cls.startsWith(p)))
      .sort();

    expect(stale).toEqual([]);
  });
});
