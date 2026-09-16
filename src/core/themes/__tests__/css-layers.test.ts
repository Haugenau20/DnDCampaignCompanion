// src/core/themes/__tests__/css-layers.test.ts
// Every rule in the theme stylesheets must live in a cascade layer.
//
// Layers make precedence legible, but they introduce one sharp edge: unlayered
// CSS outranks *every* layer regardless of specificity. A rule added outside a
// layer would therefore silently beat all of this, which is the opposite of the
// property the layers exist to provide. This is the guard for that.

import * as fs from "fs";
import * as path from "path";

const CSS_DIR = path.join(__dirname, "..", "css");
const GLOBALS = path.join(__dirname, "..", "..", "..", "styles", "globals.css");

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Walks top level, returning any rule not enclosed in an `@layer` block. */
function unlayeredTopLevelRules(css: string): string[] {
  const source = stripComments(css);
  const offenders: string[] = [];
  let depth = 0;
  let layerDepth: number | null = null;
  let buffer = "";

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      if (depth === 0) {
        const head = buffer.trim();
        // `@keyframes` and `@font-face` define no declarations that participate
        // in the cascade, so a layer would govern nothing. Everything that can
        // win or lose a declaration must be layered.
        const isNonCascading = /^@(keyframes|font-face|property|charset)\b/.test(head);
        if (/^@layer\b/.test(head) || isNonCascading) {
          layerDepth = 0;
        } else if (head) {
          offenders.push(head.slice(0, 80));
        }
        buffer = "";
      }
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) layerDepth = null;
      buffer = "";
      continue;
    }
    // A statement ending in `;` at top level: @layer statements and @import
    // are the only ones allowed to sit outside a block.
    if (ch === ";" && depth === 0) {
      const stmt = buffer.trim();
      if (stmt && !/^@(layer|import|charset|tailwind)\b/.test(stmt)) {
        offenders.push(stmt.slice(0, 80));
      }
      buffer = "";
      continue;
    }
    buffer += ch;
    void layerDepth;
  }
  return offenders;
}

const cssFiles = fs
  .readdirSync(CSS_DIR)
  .filter((f) => f.endsWith(".css"))
  .map((f) => path.join(CSS_DIR, f));

describe("cascade layers", () => {
  test("the layer order is declared exactly once, before any layer is created", () => {
    // It must live in the first imported file: `@import` is hoisted above
    // everything in globals.css, so an order declared there arrives after the
    // imported files have already created their layers. Getting this wrong put
    // Tailwind's preflight in a later layer than the app's rules and changed
    // 1135 of 3361 elements.
    const variables = stripComments(fs.readFileSync(path.join(CSS_DIR, "variables.css"), "utf8"));
    const statements = variables.match(/@layer[^;{]*;/g) ?? [];
    expect(statements).toHaveLength(1);
    const declaration = statements[0] as string;
    expect(declaration).toContain("tw-base");
    expect(declaration).toContain("tw-utilities");

    // Order matters: app rules must sit above Tailwind's preflight, state above
    // app, and utilities last.
    const order = declaration
      .replace(/@layer\s*/, "")
      .replace(";", "")
      .split(",")
      .map((s) => s.trim());
    expect(order.indexOf("tw-base")).toBeLessThan(order.indexOf("app"));
    expect(order.indexOf("app")).toBeLessThan(order.indexOf("app-state"));
    expect(order.indexOf("app-state")).toBeLessThan(order.indexOf("tw-utilities"));
    expect(order[order.length - 1]).toBe("tw-utilities");
  });

  describe.each([...cssFiles, GLOBALS].map((f) => [path.basename(f), f]))("%s", (_name, file) => {
    test("declares no rule outside a cascade layer", () => {
      expect(unlayeredTopLevelRules(fs.readFileSync(file, "utf8"))).toEqual([]);
    });
  });

  test("globals.css wraps Tailwind's own output in layers", () => {
    const globals = stripComments(fs.readFileSync(GLOBALS, "utf8"));
    ["tw-base", "tw-components", "tw-utilities"].forEach((layer) => {
      expect(globals).toMatch(new RegExp(`@layer\\s+${layer}\\s*\\{`));
    });
    // A bare `@tailwind` outside a layer would land unlayered and outrank
    // everything.
    const bare = globals.match(/^\s*@tailwind\s+\w+;/gm) ?? [];
    const insideLayer = globals.match(/@layer\s+tw-\w+\s*\{\s*@tailwind\s+\w+;\s*\}/g) ?? [];
    expect(bare.length).toBe(insideLayer.length);
  });
});
