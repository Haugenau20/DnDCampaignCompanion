// src/core/themes/__tests__/css-custom-properties.test.ts
// Guards the one CSS pattern that fails silently: a custom property declared
// with an empty value.

import * as fs from "fs";
import * as path from "path";

const CSS_DIR = path.join(__dirname, "..", "css");
const cssFiles = fs
  .readdirSync(CSS_DIR)
  .filter((f) => f.endsWith(".css"))
  .map((f) => path.join(CSS_DIR, f));

/** Strips /* ... *\/ blocks so commented-out examples are not flagged. */
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, "");

// A custom property whose value is empty or whitespace: `--foo: ;` / `--foo:;`
const EMPTY_CUSTOM_PROPERTY = /(--[A-Za-z0-9-]+)\s*:\s*(?=;|\})/g;

describe("theme CSS custom properties", () => {
  test("the css directory is found and non-empty", () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  describe.each(cssFiles.map((f) => [path.basename(f), f]))("%s", (_name, file) => {
    test("declares no custom property with an empty value", () => {
      const source = stripComments(fs.readFileSync(file, "utf8"));
      const offenders = [...source.matchAll(EMPTY_CUSTOM_PROPERTY)].map((m) => m[1]);

      // An empty custom property is *defined*, not guaranteed-invalid, so
      // `var(--foo, fallback)` never reaches its fallback -- substitution
      // yields nothing, the declaration becomes invalid at computed-value
      // time, and the property resolves to `unset` with no warning. That
      // silently defeats the token model's fallback rule, which is what keeps
      // unmigrated themes rendering. See Q7 in docs/design/plan/03-drift-log.md.
      expect(offenders).toEqual([]);
    });
  });
});
