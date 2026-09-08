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

import React from "react";
import * as fs from "fs";
import * as path from "path";
import { render, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeContext";
import { themes } from "../definitions";
import { ThemeName } from "../types";

const BASELINE = path.join(__dirname, "token-values.baseline.json");
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
    test("no token in the baseline changed value or disappeared", () => {
      const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
      const expected = baseline[themeName] ?? {};
      const actual = current[themeName];

      // Compare only the baseline's keys: new tokens are allowed, changed and
      // missing ones are not. Building both objects over the same key set makes
      // jest print a single readable diff instead of one failure per token.
      const expectedSubset: TokenMap = {};
      const actualSubset: TokenMap = {};
      Object.keys(expected).sort().forEach((k) => {
        expectedSubset[k] = expected[k];
        actualSubset[k] = actual[k] ?? "<MISSING>";
      });
      expect(actualSubset).toEqual(expectedSubset);
    });
  });
});
