// src/hooks/__tests__/useSearch.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';

// ---------------------------------------------------------------------------
// Mock SearchContext
// ---------------------------------------------------------------------------
const mockSetQuery = jest.fn();
const mockHandleSearch = jest.fn();
const mockClearSearch = jest.fn();

jest.mock('../../context/SearchContext', () => ({
  useSearch: jest.fn(),
}));

const { useSearch: useSearchContext } = require('../../context/SearchContext');

const defaultContextValue = () => ({
  query: '',
  setQuery: mockSetQuery,
  handleSearch: mockHandleSearch,
  clearSearch: mockClearSearch,
  results: [],
  isSearching: false,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useSearchContext as jest.Mock).mockReturnValue(defaultContextValue());
    mockHandleSearch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose all expected properties', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current).toHaveProperty('query');
      expect(result.current).toHaveProperty('debouncedQuery');
      expect(result.current).toHaveProperty('results');
      expect(result.current).toHaveProperty('isSearching');
      expect(result.current).toHaveProperty('onSearch');
      expect(result.current).toHaveProperty('onClearSearch');
      expect(result.current).toHaveProperty('setQuery');
      expect(result.current).toHaveProperty('handleSearch');
      expect(result.current).toHaveProperty('clearSearch');
    });

    test('should start with debouncedQuery matching initial query', () => {
      const { result } = renderHook(() => useSearch());
      expect(result.current.debouncedQuery).toBe('');
    });

    test('should pass through results from context', () => {
      const mockResults = [{ id: '1', type: 'npc' as const, title: 'Gandalf', excerpt: '' }];
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        results: mockResults,
      });

      const { result } = renderHook(() => useSearch());
      expect(result.current.results).toEqual(mockResults);
    });

    test('should pass through isSearching from context', () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        isSearching: true,
      });

      const { result } = renderHook(() => useSearch());
      expect(result.current.isSearching).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // onSearch / setQuery
  // -------------------------------------------------------------------------
  describe('onSearch', () => {
    test('should call setQuery with the provided search string', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.onSearch('dragon');
      });

      expect(mockSetQuery).toHaveBeenCalledWith('dragon');
    });
  });

  // -------------------------------------------------------------------------
  // Debounce behavior
  // -------------------------------------------------------------------------
  describe('debounce behavior', () => {
    test('should initialize debouncedQuery with the current context query value', () => {
      // The hook initializes debouncedQuery with useState(query) so it starts
      // with whatever query is in context at render time
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'dragon',
      });

      const { result } = renderHook(() => useSearch());

      // debouncedQuery is initialized to match query immediately
      expect(result.current.debouncedQuery).toBe('dragon');
    });

    test('should debounce debouncedQuery updates when query changes via rerender', async () => {
      // Start with empty query
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: '',
      });

      const { result, rerender } = renderHook(() => useSearch());
      expect(result.current.debouncedQuery).toBe('');

      // Simulate query changing in context (e.g. after calling onSearch)
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'wizard',
      });
      rerender();

      // Before debounce fires: still old value
      expect(result.current.debouncedQuery).toBe('');

      // After debounce fires
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('wizard');
      });
    });

    test('should use custom debounce delay when provided', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: '',
      });

      const { result, rerender } = renderHook(() => useSearch({ debounceMs: 500 }));

      // Query changes
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'elf',
      });
      rerender();

      // Not yet updated after 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current.debouncedQuery).toBe('');

      // Updated after 500ms total
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.debouncedQuery).toBe('elf');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Auto-search on debouncedQuery
  // -------------------------------------------------------------------------
  describe('auto-search on debouncedQuery change', () => {
    test('should call handleSearch when debouncedQuery meets minQueryLength', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'dr',
      });

      renderHook(() => useSearch({ minQueryLength: 2 }));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith('dr');
      });
    });

    test('should NOT call handleSearch when debouncedQuery is shorter than minQueryLength', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'd',
      });

      renderHook(() => useSearch({ minQueryLength: 2 }));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Wait to ensure no call happens
      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockHandleSearch).not.toHaveBeenCalled();
    });

    test('should NOT call handleSearch when debouncedQuery is empty', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: '',
      });

      renderHook(() => useSearch());

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockHandleSearch).not.toHaveBeenCalled();
    });

    test('should use custom minQueryLength when provided', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'ab',
      });

      renderHook(() => useSearch({ minQueryLength: 3 }));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        jest.runAllTimers();
      });

      // 'ab' is only 2 chars, so below minQueryLength=3
      expect(mockHandleSearch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // onClearSearch
  // -------------------------------------------------------------------------
  describe('onClearSearch', () => {
    test('should call clearSearch from context', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.onClearSearch();
      });

      expect(mockClearSearch).toHaveBeenCalled();
    });

    test('should reset debouncedQuery to empty string', () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'dragon',
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onClearSearch();
      });

      expect(result.current.debouncedQuery).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Default options
  // -------------------------------------------------------------------------
  describe('default options', () => {
    test('should use 300ms debounce and minQueryLength=2 by default', async () => {
      (useSearchContext as jest.Mock).mockReturnValue({
        ...defaultContextValue(),
        query: 'ab',
      });

      renderHook(() => useSearch());

      // Should trigger after 300ms with 2 chars
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockHandleSearch).toHaveBeenCalledWith('ab');
      });
    });
  });
});
