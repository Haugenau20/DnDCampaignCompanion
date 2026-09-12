// src/core/themes/definitions/__tests__/themes.test.ts
// Structural validation of both theme definitions.
//
// This used to hand-enumerate every key, which meant the test had to be edited
// in lockstep with the model and could only ever check what someone remembered
// to list. The token tree is enumerable, so traversal checks the whole set --
// including the property the old test could not express at all: that the
// themes define exactly the same token paths as each other.

import { lightTheme } from '../lightTheme';
import { darkTheme } from '../darkTheme';
import { themes } from '../index';
import { Theme, ThemeName, CueToken, ColorSchemeToken } from '../../types';
import { findIllegalEnumValues, LEGAL_CUES, LEGAL_SCHEMES } from '../../derive';
import { flattenTokens, variableNameFor, TokenTree } from '../../token-variables';

const ALL: ReadonlyArray<[string, Theme]> = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

/** Every leaf in a token tree, as dotted paths paired with their value. */
function leaves(node: TokenTree, trail: string[] = []): Array<[string, string]> {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = [...trail, key];
    if (typeof value === 'string') return [[path.join('.'), value] as [string, string]];
    // An ordered collection contributes one leaf per entry, indexed, so a
    // missing or extra palette entry shows up as a path difference.
    if (Array.isArray(value)) {
      return value.map(
        (entry, i) => [`${path.join('.')}[${i}]`, entry] as [string, string]
      );
    }
    return leaves(value, path);
  });
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

    test('every surface defines every role', () => {
      // No partial surfaces: a surface that omits a role forces the consumer
      // to reach for another surface's value, which is how ink and background
      // drift apart in the first place.
      Object.entries(theme.tokens.surface).forEach(([surfaceName, pair]) => {
        expect({ surface: surfaceName, roles: Object.keys(pair).sort() }).toEqual({
          surface: surfaceName,
          roles: ['bg', 'border', 'hover', 'on', 'onMuted', 'selected'].sort(),
        });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Enum tokens
  // -------------------------------------------------------------------------
  //
  // `scheme` is the first enum token in this model, and it is checked
  // differently from every colour above it. `01-token-model.md` section 6 is
  // explicit about why: "Validating an enum means checking the **value** is
  // legal, not just that the variable exists. That is a stronger guarantee than
  // a spelling check."
  //
  // Everything else here proves a token is *present* and that the themes agree
  // on the *set* of paths. Neither would notice `scheme: 'drak'`, which would
  // sail through the manifest as a defined variable and then be silently
  // ignored by the browser -- `color-scheme` drops values it does not
  // recognise, so the failure looks exactly like the bug this PR fixes.
  //
  // This is Q2's first concrete instance in the app. The package question --
  // whether `theme-contract` validates enum values or only existence -- is
  // still open, but it now has a worked answer to inherit rather than a
  // hypothetical.
  describe('enum tokens carry a legal value, not merely a present one', () => {

    test.each(ALL)('%s declares a scheme the browser understands', (_name, theme) => {
      expect(LEGAL_SCHEMES).toContain(theme.tokens.scheme);
    });

    // The check above passes for a theme that declares nothing, if `scheme`
    // were ever made optional -- `toContain` on undefined would throw, but a
    // reader should not have to work that out. Asserted directly.
    test.each(ALL)('%s declares a scheme at all', (_name, theme) => {
      expect(typeof theme.tokens.scheme).toBe('string');
    });

    // The theme's name is not the source of truth, but where a theme *is*
    // named after its scheme the two must not contradict each other -- that
    // would be a typo, not a design choice. A future theme named for something
    // other than its scheme simply is not covered by this.
    test.each(ALL)('%s does not contradict its own name', (name, theme) => {
      if (name === 'light' || name === 'dark') {
        expect(theme.tokens.scheme).toBe(name);
      }
    });

    // `cue` is the second instance of the shape, and the first with more than
    // one member in play. It fails the same silent way: `cue.failure: 'hatchh'`
    // defines the variable, satisfies the manifest, and paints no hatching --
    // which matters because 12-4's hatch is not decoration. It is what makes
    // the accent and `outcome.failed`, 40 degrees apart on a warm palette, safe
    // for a deuteranopic reader.
    test.each(ALL)('%s declares legal cue values', (_name, theme) => {
      expect({
        failure: LEGAL_CUES.includes(theme.tokens.cue.failure),
        negation: LEGAL_CUES.includes(theme.tokens.cue.negation),
      }).toEqual({ failure: true, negation: true });
    });

    // Existence, asserted separately for the reason given above `scheme`'s:
    // `toContain` on undefined throws rather than failing usefully.
    test.each(ALL)('%s declares both cues at all', (_name, theme) => {
      expect([typeof theme.tokens.cue.failure, typeof theme.tokens.cue.negation]).toEqual([
        'string',
        'string',
      ]);
    });

    // The checks above are only worth having if they can fail, and a gate that
    // has never been seen to fail is indistinguishable from one that cannot.
    // `findIllegalEnumValues` is the same function generation itself runs, so
    // this pins the real gate rather than a restatement of it.
    describe('the check rejects what it is meant to reject', () => {
      test('a misspelt cue is caught, and named', () => {
        const broken = {
          ...lightTheme.tokens,
          cue: { ...lightTheme.tokens.cue, failure: 'hatchh' as CueToken },
        };
        expect(findIllegalEnumValues(broken)).toEqual([
          { token: 'cue.failure', value: 'hatchh', legal: LEGAL_CUES },
        ]);
      });

      test("a scheme the browser would drop is caught", () => {
        const broken = { ...lightTheme.tokens, scheme: 'drak' as ColorSchemeToken };
        expect(findIllegalEnumValues(broken).map((e) => e.token)).toEqual(['scheme']);
      });

      test('both real themes are clean', () => {
        expect(ALL.map(([n, t]) => [n, findIllegalEnumValues(t.tokens)])).toEqual([
          ['light', []],
          ['dark', []],
        ]);
      });
    });
  });

  test('both themes define exactly the same token paths', () => {
    const paths = ALL.map(([, t]) => leaves(treeOf(t)).map(([p]) => p).sort());
    const [light, dark] = paths;
    // Compared against light in both directions so a missing *or* extra token
    // in dark is named in the failure.
    expect(dark).toEqual(light);
  });

  test('the themes index exposes both by name', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
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
