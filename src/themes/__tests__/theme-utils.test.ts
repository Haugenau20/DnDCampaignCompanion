// src/themes/__tests__/theme-utils.test.ts
// Behavioral unit tests for theme-utils.ts — every exported function.

import {
  ismedievalTheme,
  getThemeClasses,
  combineThemeStyles,
  getMedievalDecoration,
} from '../theme-utils';
import { ThemeName } from '../types';

// ---------------------------------------------------------------------------
// ismedievalTheme
// ---------------------------------------------------------------------------

describe('ismedievalTheme', () => {
  describe('returns true', () => {
    test('returns true when theme is "medieval"', () => {
      expect(ismedievalTheme('medieval')).toBe(true);
    });
  });

  describe('returns false', () => {
    test('returns false when theme is "light"', () => {
      expect(ismedievalTheme('light')).toBe(false);
    });

    test('returns false when theme is "dark"', () => {
      expect(ismedievalTheme('dark')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// getThemeClasses
// ---------------------------------------------------------------------------

describe('getThemeClasses', () => {
  // -----------------------------------------------------------------------
  // Medieval theme — each component type should return a class string
  // -----------------------------------------------------------------------
  describe('medieval theme', () => {
    const components: Array<Parameters<typeof getThemeClasses>[1]> = [
      'card',
      'button',
      'input',
      'typography',
      'layout',
      'navigation',
    ];

    test.each(components)(
      'returns a non-empty class string for component "%s"',
      (component) => {
        const result = getThemeClasses('medieval', component);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    );

    test('returns "medieval-card" for card component', () => {
      expect(getThemeClasses('medieval', 'card')).toBe('medieval-card');
    });

    test('returns "medieval-button" for button component', () => {
      expect(getThemeClasses('medieval', 'button')).toBe('medieval-button');
    });

    test('returns "medieval-input" for input component', () => {
      expect(getThemeClasses('medieval', 'input')).toBe('medieval-input');
    });

    test('returns "medieval-typography" for typography component', () => {
      expect(getThemeClasses('medieval', 'typography')).toBe('medieval-typography');
    });

    test('returns "medieval-theme" for layout component', () => {
      expect(getThemeClasses('medieval', 'layout')).toBe('medieval-theme');
    });

    test('returns "medieval-navigation" for navigation component', () => {
      expect(getThemeClasses('medieval', 'navigation')).toBe('medieval-navigation');
    });
  });

  // -----------------------------------------------------------------------
  // Non-medieval themes — should return empty string for any component
  // -----------------------------------------------------------------------
  describe('light theme — always returns empty string', () => {
    const components: Array<Parameters<typeof getThemeClasses>[1]> = [
      'card',
      'button',
      'input',
      'typography',
      'layout',
      'navigation',
    ];

    test.each(components)(
      'returns "" for component "%s" in light theme',
      (component) => {
        expect(getThemeClasses('light', component)).toBe('');
      }
    );
  });

  describe('dark theme — always returns empty string', () => {
    const components: Array<Parameters<typeof getThemeClasses>[1]> = [
      'card',
      'button',
      'input',
      'typography',
      'layout',
      'navigation',
    ];

    test.each(components)(
      'returns "" for component "%s" in dark theme',
      (component) => {
        expect(getThemeClasses('dark', component)).toBe('');
      }
    );
  });
});

// ---------------------------------------------------------------------------
// combineThemeStyles
// ---------------------------------------------------------------------------

describe('combineThemeStyles', () => {
  test('returns baseStyles alone when themeStyles has no entry for the current theme', () => {
    const result = combineThemeStyles('light', 'base-class', {
      medieval: 'medieval-extra',
    });
    expect(result).toBe('base-class');
  });

  test('combines baseStyles and theme-specific styles when a match exists', () => {
    const result = combineThemeStyles('medieval', 'base-class', {
      medieval: 'medieval-extra',
    });
    expect(result).toBe('base-class medieval-extra');
  });

  test('trims leading/trailing whitespace from the combined string', () => {
    // base is empty — result should not start with a space
    const result = combineThemeStyles('medieval', '', {
      medieval: 'medieval-extra',
    });
    expect(result).toBe('medieval-extra');
  });

  test('returns baseStyles trimmed when themeStyles entry is empty string', () => {
    const result = combineThemeStyles('light', 'base-class', {
      light: '',
    });
    expect(result).toBe('base-class');
  });

  test('works with all three valid ThemeNames as keys', () => {
    const themeStyles: Partial<Record<ThemeName, string>> = {
      light: 'light-extra',
      dark: 'dark-extra',
      medieval: 'medieval-extra',
    };

    expect(combineThemeStyles('light', 'base', themeStyles)).toBe('base light-extra');
    expect(combineThemeStyles('dark', 'base', themeStyles)).toBe('base dark-extra');
    expect(combineThemeStyles('medieval', 'base', themeStyles)).toBe('base medieval-extra');
  });

  test('returns baseStyles unchanged when themeStyles is an empty object', () => {
    const result = combineThemeStyles('light', 'only-base', {});
    expect(result).toBe('only-base');
  });

  test('returns empty string when both base and theme-specific styles are empty', () => {
    const result = combineThemeStyles('light', '', { light: '' });
    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getMedievalDecoration
// ---------------------------------------------------------------------------

describe('getMedievalDecoration', () => {
  test('returns "medieval-heading" for "heading"', () => {
    expect(getMedievalDecoration('heading')).toBe('medieval-heading');
  });

  test('returns "medieval-card" for "card"', () => {
    expect(getMedievalDecoration('card')).toBe('medieval-card');
  });

  test('returns "medieval-divider" for "divider"', () => {
    expect(getMedievalDecoration('divider')).toBe('medieval-divider');
  });

  test('returns "medieval-section" for "section"', () => {
    expect(getMedievalDecoration('section')).toBe('medieval-section');
  });

  test('returns a non-empty string for every valid element', () => {
    const elements: Array<Parameters<typeof getMedievalDecoration>[0]> = [
      'heading',
      'card',
      'divider',
      'section',
    ];
    elements.forEach((el) => {
      expect(getMedievalDecoration(el).length).toBeGreaterThan(0);
    });
  });
});
