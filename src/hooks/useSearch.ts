// hooks/useSearch.ts
import { useCallback, useEffect, useState } from 'react';
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
  debounceMs: 300,
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

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= options.minQueryLength) {
      handleSearch(debouncedQuery);
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
  }, [clearSearch]);

  return {
    // Search state
    query,
    debouncedQuery,
    results,
    isSearching,

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