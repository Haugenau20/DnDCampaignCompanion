// src/components/shared/__tests__/GlobalActionButton.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GlobalActionButton from '../GlobalActionButton';

// ---------------------------------------------------------------------------
// Mock NavigationContext
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn((path: string) => path);

jest.mock('../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../context/NavigationContext');

// ---------------------------------------------------------------------------
// Mock NoteContext
// ---------------------------------------------------------------------------
const mockCreateNote = jest.fn();

jest.mock('../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

const { useNotes } = require('../../../context/NoteContext');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNavMock(overrides = {}) {
  return {
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    ...overrides,
  };
}

function makeNotesMock(overrides = {}) {
  return {
    createNote: mockCreateNote,
    ...overrides,
  };
}

function renderGlobalActionButton() {
  return render(<GlobalActionButton />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GlobalActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(makeNavMock());
    (useNotes as jest.Mock).mockReturnValue(makeNotesMock());
    mockCreateNote.mockResolvedValue('new-note-id');
  });

  // -------------------------------------------------------------------------
  // Main toggle button
  // -------------------------------------------------------------------------
  describe('main toggle button', () => {
    test('should render the main action button', () => {
      renderGlobalActionButton();
      expect(
        screen.getByRole('button', { name: /open action menu/i })
      ).toBeInTheDocument();
    });

    test('should start in closed state (no action menu visible)', () => {
      renderGlobalActionButton();
      expect(screen.queryByText('New Note')).not.toBeInTheDocument();
    });

    test('should open the action menu when main button is clicked', () => {
      renderGlobalActionButton();
      fireEvent.click(screen.getByRole('button', { name: /open action menu/i }));
      expect(screen.getByText('New Note')).toBeInTheDocument();
    });

    test('should change aria-label to "Close action menu" when open', () => {
      renderGlobalActionButton();
      fireEvent.click(screen.getByRole('button', { name: /open action menu/i }));
      expect(
        screen.getByRole('button', { name: /close action menu/i })
      ).toBeInTheDocument();
    });

    test('should close the action menu when main button is clicked again', () => {
      renderGlobalActionButton();
      const toggleBtn = screen.getByRole('button', { name: /open action menu/i });
      fireEvent.click(toggleBtn);
      expect(screen.getByText('New Note')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /close action menu/i }));
      expect(screen.queryByText('New Note')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Action items when open
  // -------------------------------------------------------------------------
  describe('action items when open', () => {
    function openMenu() {
      renderGlobalActionButton();
      fireEvent.click(screen.getByRole('button', { name: /open action menu/i }));
    }

    test('should display "New Note" action', () => {
      openMenu();
      expect(screen.getByText('New Note')).toBeInTheDocument();
    });

    test('should display "New Location" action', () => {
      openMenu();
      expect(screen.getByText('New Location')).toBeInTheDocument();
    });

    test('should display "New NPC" action', () => {
      openMenu();
      expect(screen.getByText('New NPC')).toBeInTheDocument();
    });

    test('should display "New Rumor" action', () => {
      openMenu();
      expect(screen.getByText('New Rumor')).toBeInTheDocument();
    });

    test('should display "New Quest" action', () => {
      openMenu();
      expect(screen.getByText('New Quest')).toBeInTheDocument();
    });

    test('should display "New Chapter" action', () => {
      openMenu();
      expect(screen.getByText('New Chapter')).toBeInTheDocument();
    });

    test('should display all 6 action items', () => {
      openMenu();
      const expectedActions = ['New Note', 'New Location', 'New NPC', 'New Rumor', 'New Quest', 'New Chapter'];
      expectedActions.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Navigation actions
  // -------------------------------------------------------------------------
  describe('navigation actions', () => {
    function openMenu() {
      renderGlobalActionButton();
      fireEvent.click(screen.getByRole('button', { name: /open action menu/i }));
    }

    test('should navigate to /locations/create when "New Location" is clicked', () => {
      openMenu();
      fireEvent.click(screen.getByText('New Location'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations/create');
    });

    test('should navigate to /npcs/create when "New NPC" is clicked', () => {
      openMenu();
      fireEvent.click(screen.getByText('New NPC'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs/create');
    });

    test('should navigate to /rumors/create when "New Rumor" is clicked', () => {
      openMenu();
      fireEvent.click(screen.getByText('New Rumor'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/rumors/create');
    });

    test('should navigate to /quests/create when "New Quest" is clicked', () => {
      openMenu();
      fireEvent.click(screen.getByText('New Quest'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/create');
    });

    test('should navigate to /story/chapters/create when "New Chapter" is clicked', () => {
      openMenu();
      fireEvent.click(screen.getByText('New Chapter'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/create');
    });

    test('should close the menu after a navigation action', () => {
      openMenu();
      fireEvent.click(screen.getByText('New Location'));
      expect(screen.queryByText('New Location')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // New Note action
  // -------------------------------------------------------------------------
  describe('"New Note" action', () => {
    function openMenu() {
      renderGlobalActionButton();
      fireEvent.click(screen.getByRole('button', { name: /open action menu/i }));
    }

    test('should call createNote when "New Note" is clicked', async () => {
      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('New Note'));
      });
      expect(mockCreateNote).toHaveBeenCalledWith('New Note', '');
    });

    test('should navigate to the new note after creation', async () => {
      mockCreateNote.mockResolvedValue('note-abc-123');
      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('New Note'));
      });
      expect(mockNavigateToPage).toHaveBeenCalledWith('/notes/note-abc-123');
    });

    test('should close the menu after note creation', async () => {
      openMenu();
      await act(async () => {
        fireEvent.click(screen.getByText('New Note'));
      });
      await waitFor(() => {
        expect(screen.queryByText('New Note')).not.toBeInTheDocument();
      });
    });

    test('should handle createNote failure gracefully without crashing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateNote.mockRejectedValue(new Error('Note creation failed'));
      openMenu();
      // Should not throw
      await act(async () => {
        fireEvent.click(screen.getByText('New Note'));
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
