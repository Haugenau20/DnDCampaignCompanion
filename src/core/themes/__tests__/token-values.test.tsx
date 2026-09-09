// src/core/themes/__tests__/token-values.test.tsx
// The Phase 1 gate, as a test.
//
// Phase 1 restructures how theme tokens are declared and applied. Its gate is
// that nothing changes visually, which for a token restructure means exactly
// one thing: every token that existed before still resolves to the same value,
// in every theme. That is checkable from the token set alone -- more precisely
// than a screenshot, which cannot tell a value change from a rendering
// difference.
//
// Adding tokens is allowed; Phase 1 introduces surface pairs by design. Only
// changing or losing an existing one fails.
//
// To re-baseline deliberately (e.g. after a value change is agreed and logged
// in docs/design/plan/03-drift-log.md):
//     UPDATE_TOKEN_BASELINE=1 npx jest --testPathPattern=token-values
//
// The baseline was re-recorded in Phase 5, when the light theme was retuned and
// 73 of its values changed on purpose. Two consequences:
//
//   * It is now written in current variable names, so `resolve` below is
//     usually the identity. The rename map stays because it is the record of
//     the Phase 1 migration and of every deliberate revaluation since -- but it
//     no longer has work to do on a freshly recorded baseline.
//   * Re-baselining is the one operation that can hide a mistake, because it
//     accepts whatever is there. Before doing it, diff the old and new files
//     per theme and confirm the changes are the ones you meant. Phase 5's diff
//     was 73 light values and zero in dark or medieval, which is what proved
//     the retune had the blast radius it claimed.

import React from "react";
import * as fs from "fs";
import * as path from "path";
import { render, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeContext";
import { themes } from "../definitions";
import { ThemeName } from "../types";

const BASELINE = path.join(__dirname, "token-values.baseline.json");
const RENAME_MAP = path.join(__dirname, "token-rename-map.json");
const THEME_NAMES = Object.keys(themes) as ThemeName[];

type TokenMap = Record<string, string>;
type Baseline = Record<string, TokenMap>;

/** Drives the real ThemeProvider, then reads what it wrote to the root element. */
function captureTokens(themeName: ThemeName): TokenMap {
  const root = document.documentElement;
  root.removeAttribute("style");

  let setTheme: (n: ThemeName) => void = () => {};
  const Probe: React.FC = () => {
    setTheme = useTheme().setTheme;
    return null;
  };
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
  act(() => setTheme(themeName));

  const out: TokenMap = {};
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (prop.startsWith("--")) out[prop] = root.style.getPropertyValue(prop).trim();
  }
  return out;
}

const current: Baseline = {};
beforeAll(() => {
  THEME_NAMES.forEach((n) => {
    current[n] = captureTokens(n);
  });
  if (process.env.UPDATE_TOKEN_BASELINE) {
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n", "utf8");
  }
});

describe("theme token values", () => {
  test("a baseline exists (run with UPDATE_TOKEN_BASELINE=1 to create one)", () => {
    expect(fs.existsSync(BASELINE)).toBe(true);
  });

  test("every theme applies a non-trivial number of tokens", () => {
    THEME_NAMES.forEach((n) => {
      expect(Object.keys(current[n]).length).toBeGreaterThan(50);
    });
  });

  describe.each(THEME_NAMES)("%s theme", (themeName) => {
    test("every token from before the rename still resolves to the same value", () => {
      const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
      const renameMap = JSON.parse(fs.readFileSync(RENAME_MAP, "utf8"));
      const expected = baseline[themeName] ?? {};
      const actual = current[themeName];

      // Resolve each pre-rename variable to whatever carries its value now: a
      // renamed variable, the token a retired one was always an alias for, or
      // itself where the name was already role-shaped. Comparing through this
      // map is what lets a 336-site rename still prove nothing changed value.
      const resolve = (name: string): string =>
        renameMap.renamed[name] ?? renameMap.retired[name] ?? name;

      // A token whose value was deliberately changed is still pinned -- to its
      // new value. Listing it here is not an exemption; it swaps which value
      // the token is held to, and every other token stays locked to the
      // baseline, so an accidental change anywhere else still fails.
      const revalued: Record<string, { to: string }> =
        (renameMap.revalued ?? {})[themeName] ?? {};

      const expectedByOldName: TokenMap = {};
      const actualByOldName: TokenMap = {};
      Object.keys(expected).sort().forEach((oldName) => {
        expectedByOldName[oldName] =
          oldName in revalued ? revalued[oldName].to : expected[oldName];
        actualByOldName[oldName] = actual[resolve(oldName)] ?? "<MISSING>";
      });
      expect(actualByOldName).toEqual(expectedByOldName);
    });
  });

  test("the rename map accounts for every pre-rename variable", () => {
    const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    const renameMap = JSON.parse(fs.readFileSync(RENAME_MAP, "utf8"));
    const unaccounted = Object.keys(baseline.light).filter(
      (name) =>
        !(name in renameMap.renamed) &&
        !(name in renameMap.retired) &&
        !(name in current.light)
    );
    expect(unaccounted).toEqual([]);
  });
});
