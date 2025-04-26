// components/shared/SearchBar.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useSearch } from '../../hooks/useSearch';
import { SearchResult, SearchResultType } from '../../types/search';
import Typography from '../core/Typography';
import { useNavigation } from '../../context/NavigationContext';
import { clsx } from 'clsx';
import { 
  Search as SearchIcon, 
  X, 
  Loader2,
  Book,
  Scroll,
  Users,
  MapPin,
  MessageSquare
} from 'lucide-react';

// Map of icons for each result type
const resultTypeIcons: Record<SearchResultType, JSX.Element> = {
  story: <Book className="w-4 h-4" />,
  quest: <Scroll className="w-4 h-4" />,
  npc: <Users className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  rumors: <MessageSquare className="w-4 h-4" />
};

// Labels for each result type
const resultTypeLabels: Record<SearchResultType, string> = {
  story: 'Story',
  quest: 'Quest',
  npc: 'NPC',
  location: 'Location',
  rumors: 'Rumor'
};

/**
 * Search bar component with real-time search functionality and results dropdown
 */
export const SearchBar: React.FC = () => {
  const { 
    query, 
    results, 
    isSearching, 
    onSearch, 
    onClearSearch 
  } = useSearch();
  
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateToPage, createPath } = useNavigation();

  /**
   * Navigate to appropriate page based on result type
   */
  const navigateToResult = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'story':
        navigateToPage(createPath('/story', {}, { highlight: result.id }));
        break;
      case 'quest':
        navigateToPage(createPath('/quests', {}, { highlight: result.id }));
        break;
      case 'npc':
        navigateToPage(createPath('/npcs', {}, { highlight: result.id }));
        break;
      case 'location':
        navigateToPage(createPath('/locations', {}, { highlight: result.id }));
        break;
      case 'rumors':
        navigateToPage(createPath('/rumors', {}, { highlight: result.id }));
        break;
    }
  }, [navigateToPage, createPath]);

  /**
   * Handle input changes and trigger search
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
    setSelectedIndex(-1);
  }, [onSearch]);

  /**
   * Clear search and reset state
   */
  const handleClear = useCallback(() => {
    onClearSearch();
    setSelectedIndex(-1);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [onClearSearch]);

  /**
   * Handle result selection
   */
  const handleResultClick = useCallback((result: SearchResult) => {
    navigateToResult(result);
    handleClear();
  }, [navigateToResult, handleClear]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        handleClear();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          handleResultClick(results[selectedIndex]);
        }
        break;
    }
  }, [results, selectedIndex, handleClear, handleResultClick]);

  /**
   * Render an individual search result
   */
  const renderSearchResult = useCallback((result: SearchResult, index: number) => {
    const isSelected = index === selectedIndex;
    const icon = resultTypeIcons[result.type];
    const typeLabel = resultTypeLabels[result.type];

    return (
      <div
        key={`${result.type}-${result.id}`}
        className={clsx(
          'p-3 cursor-pointer',
          isSelected 
            ? `search-result-selected` 
            : `search-result`
        )}
        onClick={() => handleResultClick(result)}
        onMouseEnter={() => setSelectedIndex(index)}
        role="option"
        aria-selected={isSelected}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="primary">{icon}</span>
          <Typography variant="body" className="font-medium">
            {result.title}
          </Typography>
          <Typography variant="body-sm" color="secondary" className="ml-auto">
            {typeLabel}
          </Typography>
        </div>
        {result.matches.map((match, matchIndex) => (
          <Typography
            key={matchIndex}
            variant="body-sm"
            color="secondary"
            className="pl-6 line-clamp-1"
          >
            ...{match}...
          </Typography>
        ))}
      </div>
    );
  }, [selectedIndex, handleResultClick]);

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div 
      role="combobox"
      aria-expanded={isFocused && results.length > 0}
      aria-haspopup="listbox"
      aria-controls="search-results"
      className="relative w-full max-w-2xl"
    >
      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search stories, quests, NPCs..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border [&::-webkit-search-cancel-button]:hidden search"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
        />
        
        {/* Search Icon */}
        <SearchIcon 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 primary"
          size={18}
        />

        {/* Loading Spinner or Clear Button */}
        {(query || isSearching) && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80 primary"
            aria-label="Clear search"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isFocused && (query || isSearching) && (
      <div
        id="search-results"
        className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-96 overflow-y-auto search-results"
        role="listbox"
      >
          {results.length > 0 ? (
            <div className="py-2 divide-y card-border">
              {results.map((result, index) => renderSearchResult(result, index))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <Typography color="secondary">
                {isSearching ? 'Searching...' : 'No results found'}
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};

export default SearchBar;