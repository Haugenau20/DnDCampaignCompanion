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

const defined = new Set(
  Object.keys(flattenTokens(lightTheme.tokens as unknown as TokenTree))
);

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
