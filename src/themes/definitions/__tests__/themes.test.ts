// src/themes/definitions/__tests__/themes.test.ts
// Sanity tests for all three theme definition files.
// Verifies that each theme exports a valid Theme object matching types.ts,
// and that key nested color values are non-empty strings.

import { lightTheme } from '../lightTheme';
import { darkTheme } from '../darkTheme';
import { medievalTheme } from '../medievalTheme';
import { themes } from '../index';
import { Theme, ThemeColors, ThemeFonts, ThemeBorders } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert that a value is a non-empty string (CSS color, font string, etc.) */
function expectNonEmptyString(value: unknown, path: string) {
  expect(typeof value).toBe('string');
  expect((value as string).trim().length).toBeGreaterThan(0);
}

/** Assert that a button variant has all three required keys with string values */
function expectButtonVariant(
  variant: { background: string; text: string; hover: string },
  name: string
) {
  expectNonEmptyString(variant.background, `${name}.background`);
  expectNonEmptyString(variant.text, `${name}.text`);
  expectNonEmptyString(variant.hover, `${name}.hover`);
}

/** Full structural validation for any Theme object */
function assertValidTheme(theme: Theme, themeName: string) {
  // ------- Top-level name ---------------------------------------------------
  describe(`${themeName} — name`, () => {
    test('has a non-empty name string', () => {
      expect(typeof theme.name).toBe('string');
      expect(theme.name.length).toBeGreaterThan(0);
    });
  });

  // ------- Colors -----------------------------------------------------------
  describe(`${themeName} — colors`, () => {
    test('has primary, secondary, accent colors as non-empty strings', () => {
      expectNonEmptyString(theme.colors.primary, 'colors.primary');
      expectNonEmptyString(theme.colors.secondary, 'colors.secondary');
      expectNonEmptyString(theme.colors.accent, 'colors.accent');
    });

    test('has background.primary, background.secondary, background.accent', () => {
      expectNonEmptyString(theme.colors.background.primary, 'background.primary');
      expectNonEmptyString(theme.colors.background.secondary, 'background.secondary');
      expectNonEmptyString(theme.colors.background.accent, 'background.accent');
    });

    test('has text.primary, text.secondary, text.accent', () => {
      expectNonEmptyString(theme.colors.text.primary, 'text.primary');
      expectNonEmptyString(theme.colors.text.secondary, 'text.secondary');
      expectNonEmptyString(theme.colors.text.accent, 'text.accent');
    });

    test('has card.background and card.border', () => {
      expectNonEmptyString(theme.colors.card.background, 'card.background');
      expectNonEmptyString(theme.colors.card.border, 'card.border');
    });

    test('has all button variants with required sub-properties', () => {
      expectButtonVariant(theme.colors.button.primary, 'button.primary');
      expectButtonVariant(theme.colors.button.secondary, 'button.secondary');
      expectButtonVariant(theme.colors.button.link, 'button.link');
      expectButtonVariant(theme.colors.button.ghost, 'button.ghost');
    });

    test('button.outline has background, text, hover, border', () => {
      expectNonEmptyString(theme.colors.button.outline.background, 'button.outline.background');
      expectNonEmptyString(theme.colors.button.outline.text, 'button.outline.text');
      expectNonEmptyString(theme.colors.button.outline.hover, 'button.outline.hover');
      expectNonEmptyString(theme.colors.button.outline.border, 'button.outline.border');
    });

    test('has all status color properties', () => {
      expectNonEmptyString(theme.colors.ui.statusGeneral, 'ui.statusGeneral');
      expectNonEmptyString(theme.colors.ui.statusActive, 'ui.statusActive');
      expectNonEmptyString(theme.colors.ui.statusCompleted, 'ui.statusCompleted');
      expectNonEmptyString(theme.colors.ui.statusFailed, 'ui.statusFailed');
      expectNonEmptyString(theme.colors.ui.statusUnknown, 'ui.statusUnknown');
      expectNonEmptyString(theme.colors.ui.statusText, 'ui.statusText');
    });

    test('has header and footer background colors', () => {
      expectNonEmptyString(theme.colors.ui.headerBackground, 'ui.headerBackground');
      expectNonEmptyString(theme.colors.ui.footerBackground, 'ui.footerBackground');
    });

    test('has icon background and border colors', () => {
      expectNonEmptyString(theme.colors.ui.iconBackground, 'ui.iconBackground');
      expectNonEmptyString(theme.colors.ui.iconBorder, 'ui.iconBorder');
    });

    test('has all input styling properties', () => {
      expectNonEmptyString(theme.colors.ui.inputBackground, 'ui.inputBackground');
      expectNonEmptyString(theme.colors.ui.inputPlaceholder, 'ui.inputPlaceholder');
      expectNonEmptyString(theme.colors.ui.inputBorder, 'ui.inputBorder');
      expectNonEmptyString(theme.colors.ui.inputBorderFocus, 'ui.inputBorderFocus');
      expectNonEmptyString(theme.colors.ui.inputRingFocus, 'ui.inputRingFocus');
    });

    test('has all input error state properties', () => {
      expectNonEmptyString(theme.colors.ui.inputErrorBorder, 'ui.inputErrorBorder');
      expectNonEmptyString(theme.colors.ui.inputErrorFocus, 'ui.inputErrorFocus');
      expectNonEmptyString(theme.colors.ui.inputErrorRing, 'ui.inputErrorRing');
    });

    test('has all input success state properties', () => {
      expectNonEmptyString(theme.colors.ui.inputSuccessBorder, 'ui.inputSuccessBorder');
      expectNonEmptyString(theme.colors.ui.inputSuccessFocus, 'ui.inputSuccessFocus');
      expectNonEmptyString(theme.colors.ui.inputSuccessRing, 'ui.inputSuccessRing');
    });

    test('has all form element state properties', () => {
      expectNonEmptyString(theme.colors.ui.formDisabledBg, 'ui.formDisabledBg');
      expectNonEmptyString(theme.colors.ui.formLabelText, 'ui.formLabelText');
      expectNonEmptyString(theme.colors.ui.formHelperText, 'ui.formHelperText');
      expectNonEmptyString(theme.colors.ui.formErrorText, 'ui.formErrorText');
      expectNonEmptyString(theme.colors.ui.formSuccessText, 'ui.formSuccessText');
    });

    test('has delete button colors', () => {
      // errorBackground and deleteButtonBackground are allowed to be 'transparent'
      expect(typeof theme.colors.ui.errorBackground).toBe('string');
      expect(typeof theme.colors.ui.deleteButtonBackground).toBe('string');
      expectNonEmptyString(theme.colors.ui.deleteButtonText, 'ui.deleteButtonText');
      expectNonEmptyString(theme.colors.ui.deleteButtonHover, 'ui.deleteButtonHover');
    });

    test('has all journal-specific color properties', () => {
      expectNonEmptyString(theme.colors.ui.journalLeather, 'ui.journalLeather');
      expectNonEmptyString(theme.colors.ui.journalBinding, 'ui.journalBinding');
      expectNonEmptyString(theme.colors.ui.journalStitch, 'ui.journalStitch');
      expectNonEmptyString(theme.colors.ui.journalPageShadow, 'ui.journalPageShadow');
      expectNonEmptyString(theme.colors.ui.journalSectionDivider, 'ui.journalSectionDivider');
      expectNonEmptyString(theme.colors.ui.journalCharacterCardBg, 'ui.journalCharacterCardBg');
      expectNonEmptyString(theme.colors.ui.journalCharacterCardHover, 'ui.journalCharacterCardHover');
      expectNonEmptyString(theme.colors.ui.journalQuestItemBg, 'ui.journalQuestItemBg');
      expectNonEmptyString(theme.colors.ui.journalQuestItemHover, 'ui.journalQuestItemHover');
      expectNonEmptyString(theme.colors.ui.journalActivityHover, 'ui.journalActivityHover');
      expectNonEmptyString(theme.colors.ui.journalNotesArea, 'ui.journalNotesArea');
    });
  });

  // ------- Fonts ------------------------------------------------------------
  describe(`${themeName} — fonts`, () => {
    test('has primary, secondary, and heading font strings', () => {
      expectNonEmptyString(theme.fonts.primary, 'fonts.primary');
      expectNonEmptyString(theme.fonts.secondary, 'fonts.secondary');
      expectNonEmptyString(theme.fonts.heading, 'fonts.heading');
    });
  });

  // ------- Borders ----------------------------------------------------------
  describe(`${themeName} — borders`, () => {
    test('has radius sm, md, lg', () => {
      expectNonEmptyString(theme.borders.radius.sm, 'borders.radius.sm');
      expectNonEmptyString(theme.borders.radius.md, 'borders.radius.md');
      expectNonEmptyString(theme.borders.radius.lg, 'borders.radius.lg');
    });

    test('has width sm, md, lg', () => {
      expectNonEmptyString(theme.borders.width.sm, 'borders.width.sm');
      expectNonEmptyString(theme.borders.width.md, 'borders.width.md');
      expectNonEmptyString(theme.borders.width.lg, 'borders.width.lg');
    });
  });
}

// ---------------------------------------------------------------------------
// Run structural validation for each theme
// ---------------------------------------------------------------------------

describe('lightTheme', () => {
  test('exports a Theme with name "light"', () => {
    expect(lightTheme.name).toBe('light');
  });

  test('primary color is a hex string starting with #', () => {
    expect(lightTheme.colors.primary).toMatch(/^#/);
  });

  test('card background is white (#FFFFFF)', () => {
    expect(lightTheme.colors.card.background.toUpperCase()).toBe('#FFFFFF');
  });

  assertValidTheme(lightTheme, 'lightTheme');
});

describe('darkTheme', () => {
  test('exports a Theme with name "dark"', () => {
    expect(darkTheme.name).toBe('dark');
  });

  test('primary color is a hex string starting with #', () => {
    expect(darkTheme.colors.primary).toMatch(/^#/);
  });

  test('background primary is dark (not white)', () => {
    // Dark theme must not accidentally be set to white background
    expect(darkTheme.colors.background.primary.toUpperCase()).not.toBe('#FFFFFF');
    expect(darkTheme.colors.background.primary.toUpperCase()).not.toBe('#FFF');
  });

  assertValidTheme(darkTheme, 'darkTheme');
});

describe('medievalTheme', () => {
  test('exports a Theme with name "medieval"', () => {
    expect(medievalTheme.name).toBe('medieval');
  });

  test('primary color is deep red (#8B0000)', () => {
    expect(medievalTheme.colors.primary.toUpperCase()).toBe('#8B0000');
  });

  test('accent color is golden (#DAA520)', () => {
    expect(medievalTheme.colors.accent.toUpperCase()).toBe('#DAA520');
  });

  test('heading font includes a serif or decorative font', () => {
    // Medieval heading should be a decorative font, not a system sans-serif
    expect(medievalTheme.fonts.heading).not.toMatch(/sans-serif/i);
  });

  assertValidTheme(medievalTheme, 'medievalTheme');
});

// ---------------------------------------------------------------------------
// definitions/index — themes record
// ---------------------------------------------------------------------------

describe('themes record (definitions/index)', () => {
  test('exports a record containing all three themes', () => {
    expect(themes).toHaveProperty('light');
    expect(themes).toHaveProperty('dark');
    expect(themes).toHaveProperty('medieval');
  });

  test('themes.light is the same object as lightTheme export', () => {
    expect(themes.light).toBe(lightTheme);
  });

  test('themes.dark is the same object as darkTheme export', () => {
    expect(themes.dark).toBe(darkTheme);
  });

  test('themes.medieval is the same object as medievalTheme export', () => {
    expect(themes.medieval).toBe(medievalTheme);
  });

  test('each theme in the record has a name matching its key', () => {
    (Object.keys(themes) as Array<keyof typeof themes>).forEach((key) => {
      expect(themes[key].name).toBe(key);
    });
  });

  test('all three ThemeNames are present — no theme was accidentally removed', () => {
    const keys = Object.keys(themes);
    expect(keys).toContain('light');
    expect(keys).toContain('dark');
    expect(keys).toContain('medieval');
    expect(keys).toHaveLength(3);
  });
});
