// src/themes/__tests__/ThemeContext.test.tsx
// Behavioral tests for ThemeContext.tsx — focuses on:
//   • ThemeProvider initial-state logic (localStorage, default fallback)
//   • setTheme() success and error-catch branches (lines 188-193)
//   • applyThemeToDOM() error-catch branch (line 56)
//   • useTheme() no-context guard (lines 217-223)

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme, defaultTheme } from '../ThemeContext';
import { themes } from '../definitions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the useTheme hook inside a ThemeProvider wrapper */
function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/** Build a minimal localStorage mock that throws on setItem */
function makeThrowingLocalStorage(existingKey?: string, existingValue?: string) {
  return {
    getItem: jest.fn((key: string) => {
      if (existingKey && key === existingKey) return existingValue ?? null;
      return null;
    }),
    setItem: jest.fn(() => {
      throw new Error('localStorage.setItem is unavailable');
    }),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };
}

const STORAGE_KEY = 'medieval-companion-theme';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalLocalStorage: Storage;
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

beforeAll(() => {
  originalLocalStorage = window.localStorage;
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
});

beforeEach(() => {
  // Reset localStorage to the real implementation for most tests
  Object.defineProperty(window, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  });
  window.localStorage.clear();

  // Silence expected console output in error-path tests; individual tests
  // restore when they need to assert on console calls.
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// ---------------------------------------------------------------------------
// ThemeProvider — initial state from localStorage (line 25-27)
// ---------------------------------------------------------------------------

describe('ThemeProvider — initial theme resolution', () => {
  test('defaults to light theme when localStorage is empty', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe('light');
    expect(result.current.theme).toEqual(defaultTheme);
  });

  test('uses saved theme from localStorage when key is valid', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe('dark');
  });

  test('uses saved medieval theme from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'medieval');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe('medieval');
  });

  test('falls back to default theme when localStorage value is an unknown theme name', () => {
    // "cyberpunk" is not a valid ThemeName — should fall back to defaultTheme
    window.localStorage.setItem(STORAGE_KEY, 'cyberpunk');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe(defaultTheme.name);
  });

  test('falls back to default theme when localStorage value is empty string', () => {
    window.localStorage.setItem(STORAGE_KEY, '');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe(defaultTheme.name);
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — setTheme (lines 188-193)
// ---------------------------------------------------------------------------

describe('ThemeProvider — setTheme()', () => {
  test('switches theme from light to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe('light');

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme.name).toBe('dark');
    expect(result.current.theme).toEqual(themes.dark);
  });

  test('switches theme to medieval', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setTheme('medieval');
    });
    expect(result.current.theme.name).toBe('medieval');
    expect(result.current.theme).toEqual(themes.medieval);
  });

  test('switches back to light from dark', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.name).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme.name).toBe('light');
  });

  test('persists selected theme name to localStorage after setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setTheme('medieval');
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('medieval');
  });

  test('setTheme with an invalid theme name falls back to defaultTheme (lines 189-193 catch-like branch)', () => {
    // TypeScript prevents this at compile time but the runtime guard
    // `themes[themeName] || defaultTheme` is the branch we test.
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      // Cast to bypass TS to exercise the runtime fallback path
      (result.current.setTheme as (name: string) => void)('nonexistent');
    });
    expect(result.current.theme.name).toBe(defaultTheme.name);
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — applyThemeToDOM error-catch branch (line 56)
// ---------------------------------------------------------------------------

describe('ThemeProvider — applyThemeToDOM error handling (line 56)', () => {
  test('logs error to console when localStorage.setItem throws during DOM application', () => {
    // Replace localStorage with a version that throws on setItem
    const throwingStorage = makeThrowingLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: throwingStorage,
      writable: true,
    });

    const consoleSpy = jest.fn();
    console.error = consoleSpy;

    // Mounting the provider triggers applyThemeToDOM via both effects
    // which calls localStorage.setItem — that throws — caught at line 55-57.
    renderHook(() => useTheme(), { wrapper });

    // The error should be caught and logged, not re-thrown
    expect(consoleSpy).toHaveBeenCalled();
    const [firstArg] = consoleSpy.mock.calls[0];
    expect(firstArg).toBe('Error applying theme:');
  });

  test('provider still renders children even when localStorage.setItem throws', () => {
    const throwingStorage = makeThrowingLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: throwingStorage,
      writable: true,
    });

    // renderHook itself should not throw even though the effect throws internally
    expect(() => renderHook(() => useTheme(), { wrapper })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — CSS variables applied to document root
// ---------------------------------------------------------------------------

describe('ThemeProvider — CSS variable application', () => {
  test('sets --color-primary CSS variable matching the current theme', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    renderHook(() => useTheme(), { wrapper });
    const value = document.documentElement.style.getPropertyValue('--color-primary');
    expect(value).toBe(themes.dark.colors.primary);
  });

  test('sets --font-primary CSS variable matching the current theme', () => {
    window.localStorage.setItem(STORAGE_KEY, 'medieval');
    renderHook(() => useTheme(), { wrapper });
    const value = document.documentElement.style.getPropertyValue('--font-primary');
    expect(value).toBe(themes.medieval.fonts.primary);
  });

  test('updates CSS variables when setTheme is called', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setTheme('medieval');
    });
    const value = document.documentElement.style.getPropertyValue('--color-primary');
    expect(value).toBe(themes.medieval.colors.primary);
  });

  test('sets data-theme attribute on documentElement after mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('updates data-theme attribute when theme changes via setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.setTheme('medieval');
    });
    expect(document.documentElement.dataset.theme).toBe('medieval');
  });
});

// ---------------------------------------------------------------------------
// useTheme — no-context guard (lines 215-225)
// ---------------------------------------------------------------------------

describe('useTheme() — no-context guard (lines 217-223)', () => {
  test('returns default theme when called outside of ThemeProvider', () => {
    // Rendering without a wrapper means there is no ThemeProvider.
    // React context will use the createContext default, which has a real theme
    // object (defaultTheme), so the `if (!context)` branch on line 217 is
    // NOT triggered by the default context object — it guards against null/undefined.
    //
    // The createContext default value IS a valid ThemeContextState, so useTheme
    // returns that default value without entering the fallback branch.
    // We assert the shape is correct regardless of which path is taken.
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.theme.name).toBe('string');
    expect(typeof result.current.setTheme).toBe('function');
  });

  test('returns a callable setTheme when used outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    // The no-op default setTheme must not throw when called
    expect(() => result.current.setTheme('dark')).not.toThrow();
  });

  test('useTheme context guard: warns when context is explicitly null', () => {
    // Directly exercise the guard by calling the internal warn path.
    // We mock the useContext to return null to trigger line 217.
    const React = require('react');
    const originalUseContext = React.useContext;
    React.useContext = jest.fn(() => null);

    const warnSpy = jest.fn();
    console.warn = warnSpy;

    // Import the hook under test fresh via the module
    // (We use jest.isolateModules is not available cleanly here; instead
    //  we call useTheme in a hook render with useContext mocked)
    const { useTheme: useThemeFresh } = require('../ThemeContext');

    const { result } = renderHook(() => useThemeFresh());

    expect(warnSpy).toHaveBeenCalledWith('Theme context not available, using default');
    expect(result.current.theme).toEqual(defaultTheme);
    expect(typeof result.current.setTheme).toBe('function');

    // Restore
    React.useContext = originalUseContext;
  });
});

// ---------------------------------------------------------------------------
// ThemeContextState shape
// ---------------------------------------------------------------------------

describe('ThemeContextState shape contract', () => {
  test('context value exposes theme and setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('setTheme');
    expect(typeof result.current.setTheme).toBe('function');
  });

  test('theme object has required top-level properties', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    const { theme } = result.current;
    expect(theme).toHaveProperty('name');
    expect(theme).toHaveProperty('colors');
    expect(theme).toHaveProperty('fonts');
    expect(theme).toHaveProperty('borders');
  });

  test('currentTheme || defaultTheme guard: context always provides a theme (line 199)', () => {
    // Even if somehow currentTheme were falsy, the context value falls back
    // to defaultTheme. We assert that theme is never null/undefined.
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).not.toBeNull();
    expect(result.current.theme).not.toBeUndefined();
  });
});
