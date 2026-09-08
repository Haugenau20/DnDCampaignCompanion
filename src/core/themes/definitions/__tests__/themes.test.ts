// src/core/themes/definitions/__tests__/themes.test.ts
// Structural validation of all three theme definitions.
//
// This used to hand-enumerate every key, which meant the test had to be edited
// in lockstep with the model and could only ever check what someone remembered
// to list. The token tree is enumerable, so traversal checks the whole set --
// including the property the old test could not express at all: that the three
// themes define exactly the same token paths as each other.

import { lightTheme } from '../lightTheme';
import { darkTheme } from '../darkTheme';
import { medievalTheme } from '../medievalTheme';
import { themes } from '../index';
import { Theme, ThemeName } from '../../types';
import { flattenTokens, variableNameFor, TokenTree } from '../../token-variables';

const ALL: ReadonlyArray<[string, Theme]> = [
  ['light', lightTheme],
  ['dark', darkTheme],
  ['medieval', medievalTheme],
];

/** Every leaf in a token tree, as dotted paths paired with their value. */
function leaves(node: TokenTree, trail: string[] = []): Array<[string, string]> {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [[[...trail, key].join('.'), value] as [string, string]]
      : leaves(value, [...trail, key])
  );
}

const treeOf = (theme: Theme) => theme.tokens as unknown as TokenTree;

describe('theme definitions', () => {
  describe.each(ALL)('%s', (name, theme) => {
    test('declares its own name', () => {
      expect(theme.name).toBe(name);
    });

    test('every token is a non-empty string', () => {
      const bad = leaves(treeOf(theme)).filter(
        ([, value]) => typeof value !== 'string' || value.trim().length === 0
      );
      expect(bad).toEqual([]);
    });

    test('defines a substantial number of tokens', () => {
      expect(leaves(treeOf(theme)).length).toBeGreaterThan(90);
    });

    test('no two token paths derive the same variable name', () => {
      // flattenTokens throws on collision rather than letting one token
      // silently overwrite another.
      expect(() => flattenTokens(treeOf(theme))).not.toThrow();
    });

    test('every surface defines all four roles', () => {
      Object.entries(theme.tokens.surface).forEach(([surfaceName, pair]) => {
        expect(Object.keys(pair).sort()).toEqual(
          ['bg', 'border', 'on', 'onMuted'].sort()
        );
        expect(surfaceName.length).toBeGreaterThan(0);
      });
    });
  });

  test('all three themes define exactly the same token paths', () => {
    const paths = ALL.map(([, t]) => leaves(treeOf(t)).map(([p]) => p).sort());
    const [light, dark, medieval] = paths;
    // Compared against light in both directions so a missing *or* extra token
    // in either of the other themes is named in the failure.
    expect(dark).toEqual(light);
    expect(medieval).toEqual(light);
  });

  test('the themes index exposes all three by name', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light', 'medieval']);
    (Object.keys(themes) as ThemeName[]).forEach((n) => {
      expect(themes[n].name).toBe(n);
    });
  });
});

describe('variableNameFor', () => {
  test('joins path segments with hyphens', () => {
    expect(variableNameFor(['color', 'primary'])).toBe('--color-primary');
  });

  test('splits camelCase inside a segment', () => {
    expect(variableNameFor(['surface', 'card', 'onMuted'])).toBe('--surface-card-on-muted');
  });

  test('is stable for already-lowercase paths', () => {
    expect(variableNameFor(['border', 'width', 'sm'])).toBe('--border-width-sm');
  });
});

describe('flattenTokens', () => {
  test('rejects two paths that derive one name', () => {
    const ambiguous = {
      surface: { onMuted: '#000', 'on-muted': '#fff' },
    } as unknown as TokenTree;
    expect(() => flattenTokens(ambiguous)).toThrow(/Ambiguous token path/);
  });

  test('produces one entry per leaf', () => {
    const flat = flattenTokens(treeOf(lightTheme));
    expect(Object.keys(flat).length).toBe(leaves(treeOf(lightTheme)).length);
  });
});
