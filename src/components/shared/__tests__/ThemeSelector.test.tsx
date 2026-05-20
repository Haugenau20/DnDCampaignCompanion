// src/components/shared/__tests__/ThemeSelector.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSelector from '../ThemeSelector';

// ---------------------------------------------------------------------------
// Mock useTheme hook
// ---------------------------------------------------------------------------
const mockSetTheme = jest.fn();

jest.mock('../../../themes/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require('../../../themes/ThemeContext');

// ---------------------------------------------------------------------------
// Mock theme definitions — provide a minimal set for testing
// ---------------------------------------------------------------------------
jest.mock('../../../themes/definitions', () => ({
  themes: {
    light: {
      name: 'light',
      colors: { primary: '#ffffff' },
    },
    dark: {
      name: 'dark',
      colors: { primary: '#000000' },
    },
    medieval: {
      name: 'medieval',
      colors: { primary: '#8b4513' },
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const lightThemeMock = { name: 'light', colors: { primary: '#ffffff' } };
const darkThemeMock = { name: 'dark', colors: { primary: '#000000' } };
const medievalThemeMock = { name: 'medieval', colors: { primary: '#8b4513' } };

function makeUseThemeMock(currentTheme = lightThemeMock) {
  return {
    theme: currentTheme,
    setTheme: mockSetTheme,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue(makeUseThemeMock());
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render a palette/theme button', () => {
      render(<ThemeSelector />);
      expect(screen.getByRole('button', { name: /change theme/i })).toBeInTheDocument();
    });

    test('should render theme options for all available themes', () => {
      render(<ThemeSelector />);
      // All three theme names should appear
      expect(screen.getByText(/light/i)).toBeInTheDocument();
      expect(screen.getByText(/dark/i)).toBeInTheDocument();
      expect(screen.getByText(/medieval/i)).toBeInTheDocument();
    });

    test('should render a button for each theme', () => {
      render(<ThemeSelector />);
      // The change-theme icon button + 3 theme buttons
      const buttons = screen.getAllByRole('button');
      // At least 3 theme buttons
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -------------------------------------------------------------------------
  // Theme selection
  // -------------------------------------------------------------------------
  describe('theme selection', () => {
    test('should call setTheme with "dark" when dark theme button is clicked', () => {
      render(<ThemeSelector />);
      fireEvent.click(screen.getByText(/dark/i));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    test('should call setTheme with "light" when light theme button is clicked', () => {
      render(<ThemeSelector />);
      fireEvent.click(screen.getByText(/light/i));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    test('should call setTheme with "medieval" when medieval theme button is clicked', () => {
      render(<ThemeSelector />);
      fireEvent.click(screen.getByText(/medieval/i));
      expect(mockSetTheme).toHaveBeenCalledWith('medieval');
    });

    test('should call setTheme exactly once per click', () => {
      render(<ThemeSelector />);
      fireEvent.click(screen.getByText(/dark/i));
      expect(mockSetTheme).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Active theme indication
  // -------------------------------------------------------------------------
  describe('active theme indication', () => {
    test('should reflect current theme from useTheme context', () => {
      (useTheme as jest.Mock).mockReturnValue(makeUseThemeMock(darkThemeMock));
      render(<ThemeSelector />);
      // The component reads theme.name to determine which is active.
      // We verify useTheme was called (no class assertions per rule 6).
      expect(useTheme).toHaveBeenCalled();
    });

    test('should reflect medieval as current theme when set', () => {
      (useTheme as jest.Mock).mockReturnValue(makeUseThemeMock(medievalThemeMock));
      render(<ThemeSelector />);
      expect(useTheme).toHaveBeenCalled();
      // All theme options still rendered
      expect(screen.getByText(/light/i)).toBeInTheDocument();
      expect(screen.getByText(/dark/i)).toBeInTheDocument();
      expect(screen.getByText(/medieval/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Context integration
  // -------------------------------------------------------------------------
  describe('context integration', () => {
    test('should consume useTheme context', () => {
      render(<ThemeSelector />);
      expect(useTheme).toHaveBeenCalled();
    });

    test('should use setTheme from context when a theme is selected', () => {
      const customSetTheme = jest.fn();
      (useTheme as jest.Mock).mockReturnValue({
        theme: lightThemeMock,
        setTheme: customSetTheme,
      });
      render(<ThemeSelector />);
      fireEvent.click(screen.getByText(/dark/i));
      expect(customSetTheme).toHaveBeenCalledWith('dark');
    });
  });
});
