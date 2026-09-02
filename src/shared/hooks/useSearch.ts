// hooks/useSearch.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearch as useSearchContext } from '../context/SearchContext';

/**
 * Options for configuring search behavior
 */
interface UseSearchOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Minimum query length to trigger search */
  minQueryLength?: number;
}

/**
 * Default options for search configuration
 */
const DEFAULT_OPTIONS = {
  debounceMs: 180,
  minQueryLength: 2
} as const;

/**
 * Custom hook for handling debounced search functionality
 * Builds on top of the SearchContext to provide additional features
 * 
 * @param options - Configuration options for search behavior
 * @returns Object containing search handlers and state
 */
export const useSearch = (userOptions: UseSearchOptions = {}) => {
  // Merge default options with user options
  const options = {
    ...DEFAULT_OPTIONS,
    ...userOptions
  };

  // Get base search functionality from context
  const { 
    query, 
    setQuery, 
    handleSearch, 
    clearSearch,
    results,
    isSearching 
  } = useSearchContext();

  // State for debounced query
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Handle debounced query updates
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), options.debounceMs);
    return () => clearTimeout(timer);
  }, [query, options.debounceMs]);

  // Whether a search has actually run for the current typing session. This is
  // deliberately a ref rather than a check on `results.length`: the provider
  // returns a brand-new array from every search, so depending on `results`
  // here would re-fire this effect on its own result and loop forever.
  const hasSearched = useRef(false);

  // Perform search when debounced query changes. Below the minimum length,
  // clear any results left over from a previous, longer query instead of
  // leaving them on screen under a query that no longer matches them.
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= options.minQueryLength) {
      hasSearched.current = true;
      handleSearch(debouncedQuery);
    } else if (hasSearched.current) {
      hasSearched.current = false;
      handleSearch('');
    }
  }, [debouncedQuery, handleSearch, options.minQueryLength]);

  /**
   * Update search query
   */
  const onSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, [setQuery]);

  /**
   * Clear search and reset state
   */
  const onClearSearch = useCallback(() => {
    clearSearch();
    setDebouncedQuery('');
    // `clearSearch` already emptied the results, so the next sub-minimum query
    // has nothing left over to clear.
    hasSearched.current = false;
  }, [clearSearch]);

  /**
   * True while the user has typed something, but not yet enough characters
   * to meet `minQueryLength`. Derived from the live `query` (not the
   * debounced one) so a "keep typing" hint can appear immediately rather
   * than waiting out the debounce delay.
   */
  const isQueryTooShort = query.trim().length > 0 && query.trim().length < options.minQueryLength;

  return {
    // Search state
    query,
    debouncedQuery,
    results,
    isSearching,
    isQueryTooShort,

    // Search handlers
    onSearch,
    onClearSearch,
    
    // Original context methods (for advanced use cases)
    setQuery,
    handleSearch,
    clearSearch
  };
};

export default useSearch;