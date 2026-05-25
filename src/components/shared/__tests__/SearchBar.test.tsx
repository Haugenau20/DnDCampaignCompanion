// src/components/shared/__tests__/SearchBar.test.tsx

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SearchBar from '../SearchBar';
import { SearchResult } from '../../../types/search';

// ---------------------------------------------------------------------------
// Mock useSearch hook
// ---------------------------------------------------------------------------
const mockOnSearch = jest.fn();
const mockOnClearSearch = jest.fn();

jest.mock('../../../hooks/useSearch', () => ({
  useSearch: jest.fn(),
}));

const { useSearch } = require('../../../hooks/useSearch');

// ---------------------------------------------------------------------------
// Mock NavigationContext
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn((path: string, _params?: object, query?: object) => {
  // Simulate path creation with query params
  if (query && Object.keys(query).length > 0) {
    const qs = Object.entries(query)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${path}?${qs}`;
  }
  return path;
});

jest.mock('../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../context/NavigationContext');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSearchState = {
  query: '',
  results: [] as SearchResult[],
  isSearching: false,
  onSearch: mockOnSearch,
  onClearSearch: mockOnClearSearch,
};

function makeSearchMock(overrides = {}) {
  return { ...defaultSearchState, ...overrides };
}

function makeNavMock() {
  return {
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
  };
}

const mockResults: SearchResult[] = [
  {
    id: 'npc-1',
    type: 'npc',
    title: 'Gandalf',
    content: 'A wizard',
    matches: ['Gandalf the Grey'],
  },
  {
    id: 'quest-1',
    type: 'quest',
    title: 'Destroy the Ring',
    content: 'Main quest',
    matches: ['Ring of Power'],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearch as jest.Mock).mockReturnValue(makeSearchMock());
    (useNavigation as jest.Mock).mockReturnValue(makeNavMock());
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render a search input field', () => {
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    test('should render with placeholder text', () => {
      render(<SearchBar />);
      expect(
        screen.getByPlaceholderText(/search stories, quests, NPCs/i)
      ).toBeInTheDocument();
    });

    test('should not show results dropdown when query is empty and not focused', () => {
      render(<SearchBar />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('should not show clear button when query is empty', () => {
      render(<SearchBar />);
      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Search input
  // -------------------------------------------------------------------------
  describe('search input', () => {
    test('should call onSearch when input value changes', () => {
      render(<SearchBar />);
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: 'dragon' },
      });
      expect(mockOnSearch).toHaveBeenCalledWith('dragon');
    });

    test('should call onSearch with empty string when cleared', () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'dragon' })
      );
      render(<SearchBar />);
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: '' },
      });
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    test('should display current query value from hook', () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'wizard' })
      );
      render(<SearchBar />);
      expect(screen.getByRole('searchbox')).toHaveValue('wizard');
    });
  });

  // -------------------------------------------------------------------------
  // Clear button
  // -------------------------------------------------------------------------
  describe('clear button', () => {
    test('should show clear button when query is non-empty', () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'dragon' })
      );
      render(<SearchBar />);
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    test('should show clear button when isSearching is true', () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ isSearching: true })
      );
      render(<SearchBar />);
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    test('should call onClearSearch when clear button is clicked', () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'dragon' })
      );
      render(<SearchBar />);
      fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Results dropdown
  // -------------------------------------------------------------------------
  describe('results dropdown', () => {
    test('should show results when focused and query is non-empty with results', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    test('should render each search result title', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('Gandalf')).toBeInTheDocument();
        expect(screen.getByText('Destroy the Ring')).toBeInTheDocument();
      });
    });

    test('should show "No results found" when focused, query set, but results empty', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'zzznoresults', results: [] })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    test('should show "Searching..." when isSearching=true and focused', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', isSearching: true, results: [] })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });

    test('should render result type labels', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('NPC')).toBeInTheDocument();
        expect(screen.getByText('Quest')).toBeInTheDocument();
      });
    });

    test('should render match excerpts under results', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText(/Gandalf the Grey/)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Result navigation
  // -------------------------------------------------------------------------
  describe('result click navigation', () => {
    async function renderWithResults() {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('Gandalf')).toBeInTheDocument();
      });
    }

    test('should navigate to NPC page when NPC result is clicked', async () => {
      await renderWithResults();
      fireEvent.click(screen.getByText('Gandalf'));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('/npcs')
      );
    });

    test('should navigate to Quest page when Quest result is clicked', async () => {
      await renderWithResults();
      fireEvent.click(screen.getByText('Destroy the Ring'));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('/quests')
      );
    });

    test('should call onClearSearch after clicking a result', async () => {
      await renderWithResults();
      fireEvent.click(screen.getByText('Gandalf'));
      expect(mockOnClearSearch).toHaveBeenCalled();
    });

    test('should navigate to story page when story result is clicked', async () => {
      const storyResults: SearchResult[] = [
        {
          id: 'story-1',
          type: 'story',
          title: 'The Fellowship',
          content: 'A tale',
          matches: ['fellowship'],
        },
      ];
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'fellowship', results: storyResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('The Fellowship')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('The Fellowship'));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('/story')
      );
    });

    test('should navigate to location page when location result is clicked', async () => {
      const locationResults: SearchResult[] = [
        {
          id: 'loc-1',
          type: 'location',
          title: 'Rivendell',
          content: 'Elven city',
          matches: ['rivendell'],
        },
      ];
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'rivendell', results: locationResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('Rivendell')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Rivendell'));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('/locations')
      );
    });

    test('should navigate to rumors page when rumors result is clicked', async () => {
      const rumorsResults: SearchResult[] = [
        {
          id: 'rumor-1',
          type: 'rumors',
          title: 'The Dragon Stirs',
          content: 'A rumor',
          matches: ['dragon'],
        },
      ];
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'dragon', results: rumorsResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByText('The Dragon Stirs')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('The Dragon Stirs'));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('/rumors')
      );
    });

    test('should update selected index on mouse enter over a result', async () => {
      await renderWithResults();
      const options = screen.getAllByRole('option');
      // Hover second option
      fireEvent.mouseEnter(options[1]);
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------
  describe('keyboard navigation', () => {
    async function renderWithResults() {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      return screen.getByRole('searchbox');
    }

    test('should call onClearSearch when Escape key is pressed', async () => {
      const input = await renderWithResults();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockOnClearSearch).toHaveBeenCalled();
    });

    test('should navigate results with ArrowDown key', async () => {
      const input = await renderWithResults();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // First result should become selected (index 0)
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    test('should navigate results with ArrowUp key after ArrowDown', async () => {
      const input = await renderWithResults();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      // Should be back to first result selected
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    test('should navigate to result when Enter is pressed on selected item', async () => {
      const input = await renderWithResults();
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // ARIA attributes
  // -------------------------------------------------------------------------
  describe('ARIA attributes', () => {
    test('should have combobox role on the container', () => {
      render(<SearchBar />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('should set aria-expanded=false when results are not shown', () => {
      render(<SearchBar />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });

    test('should set aria-expanded=true when focused with results', async () => {
      (useSearch as jest.Mock).mockReturnValue(
        makeSearchMock({ query: 'gandalf', results: mockResults })
      );
      render(<SearchBar />);
      fireEvent.focus(screen.getByRole('searchbox'));
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });
});
