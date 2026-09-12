// src/core/themes/__tests__/token-manifest.test.ts
// Every variable the stylesheets consume must be one a theme actually defines.
//
// The token model makes the produced set enumerable, which is what lets this
// check exist at all. It catches the failure a rename is most likely to cause:
// a `var(--surface-crad-bg)` that no theme defines resolves to nothing, the
// declaration becomes invalid at computed-value time, and the property
// silently falls back to inherited -- no error anywhere.
//
// Note what this cannot prove: that the right variable *wins*. Precedence is a
// separate mechanism. See 01-token-model.md section 8.

import * as fs from "fs";
import * as path from "path";
import { lightTheme } from "../definitions/lightTheme";
import { darkTheme } from "../definitions/darkTheme";
import { flattenTokens, TokenTree } from "../token-variables";

const CSS_DIR = path.join(__dirname, "..", "css");
const EXTRA_FILES = [
  path.join(__dirname, "..", "..", "..", "styles", "globals.css"),
  path.join(__dirname, "..", "..", "..", "..", "tailwind.config.js"),
];

/** Variables owned by other systems, which no theme is expected to define. */
const FOREIGN_PREFIXES = ["--tw-"];

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "");

const filesToScan = (): string[] => [
  ...fs
    .readdirSync(CSS_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(CSS_DIR, f)),
  ...EXTRA_FILES.filter((f) => fs.existsSync(f)),
];

/**
 * Custom properties a scanned stylesheet declares for itself.
 *
 * Not every `var()` names a theme token. `.nav-on-chrome` and its siblings
 * declare `--nav-item-on` and three others, whose whole purpose is that
 * `.nav-item` does not hard-wire a surface (D107) -- the indirection is the
 * fix for R40, so the variables cannot come from a theme by construction.
 *
 * Collected rather than allow-listed by prefix, which is what `--tw-` gets
 * below. A prefix exemption would also excuse `--nav-item-onn`; this does not,
 * because a misspelling is still consumed-but-never-declared and still fails.
 */
const declaredInCss = (): Set<string> => {
  const out = new Set<string>();
  filesToScan().forEach((file) => {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const match of source.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)) {
      out.add(match[1]);
    }
  });
  return out;
};

const defined = new Set([
  ...Object.keys(flattenTokens(lightTheme.tokens as unknown as TokenTree)),
  ...declaredInCss(),
]);

describe("token manifest", () => {
  test("the generated set is non-trivial", () => {
    expect(defined.size).toBeGreaterThan(90);
  });

  test("finds files to scan", () => {
    expect(filesToScan().length).toBeGreaterThan(0);
  });

  test("every consumed variable is defined by the theme", () => {
    const unknown: Array<{ file: string; variable: string }> = [];

    filesToScan().forEach((file) => {
      const source = stripComments(fs.readFileSync(file, "utf8"));
      const consumed = source.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g);
      for (const match of consumed) {
        const variable = match[1];
        if (FOREIGN_PREFIXES.some((p) => variable.startsWith(p))) continue;
        if (!defined.has(variable)) {
          unknown.push({ file: path.basename(file), variable });
        }
      }
    });

    // De-duplicate so one bad name used twenty times reads as one problem.
    const distinct = [...new Map(unknown.map((u) => [u.variable, u])).values()];
    expect(distinct).toEqual([]);
  });
});

/**
 * The other direction: a variable a theme is *supposed* to define.
 *
 * The block above walks consumed to defined, which is the direction a rename
 * breaks. It cannot see a token that exists but is not yet used anywhere --
 * and that is exactly what an additive PR produces. 12-2 adds the semantic
 * scales with **no consumers**, deliberately, so that 12-3 can be reverted on
 * its own without leaving the application unstyled (token model section 5).
 *
 * Without this block, a whole scale could be misnamed, half-defined, or absent
 * from one theme, and every gate in the project would stay green until 12-3
 * wired it up. Enumerating it is what makes "additive" checkable rather than
 * merely invisible.
 */
describe("tokens with no consumers yet are still enumerated", () => {
  const EXPECTED = [
    "--outcome-succeeded",
    "--outcome-failed-ink",
    "--outcome-failed-fill",
    "--knowledge-0",
    "--knowledge-1",
    "--knowledge-2",
    "--cue-failure",
    "--cue-negation",
  ];

  const THEMES: ReadonlyArray<[string, TokenTree]> = [
    ["light", lightTheme.tokens as unknown as TokenTree],
    ["dark", darkTheme.tokens as unknown as TokenTree],
  ];

  test.each(THEMES)("%s defines every semantic-scale variable", (_name, tokens) => {
    const produced = flattenTokens(tokens);
    const missing = EXPECTED.filter((v) => !(v in produced));
    expect(missing).toEqual([]);
  });

  test.each(THEMES)("%s gives each of them a non-empty value", (_name, tokens) => {
    const produced = flattenTokens(tokens);
    const empty = EXPECTED.filter((v) => (produced[v] ?? "").trim().length === 0);
    expect(empty).toEqual([]);
  });

  // No fallback chains, and none needed. Section 5's fallback rule exists for
  // partial migration -- a theme that has not been migrated must still render.
  // Both themes are generated from one contract now, so a token cannot exist
  // in one and not the other, and a `var(--x, var(--y))` chain here would be
  // dead weight pretending to be safety.
  test("both themes define them, so no fallback is required", () => {
    const [light, dark] = THEMES.map(([, t]) => flattenTokens(t));
    expect(EXPECTED.map((v) => [v, v in light, v in dark])).toEqual(
      EXPECTED.map((v) => [v, true, true])
    );
  });
});
