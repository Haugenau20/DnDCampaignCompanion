// context/SearchContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SearchResult, SearchResultType, SearchDocument } from 'core/types/search';
import { SearchService } from 'core/services/search/SearchService';
import { useChapterData } from 'features/storytelling';
import type { Chapter } from 'features/storytelling';
import { useNPCData } from 'features/campaign-entities';
import { useLocationData } from 'features/campaign-entities';
import { useQuests, Quest } from 'features/campaign-entities';
import { NPC } from 'features/campaign-entities';
import type { Location } from 'features/campaign-entities';
import { Rumor } from 'features/campaign-entities';
import { useRumorData } from 'features/campaign-entities';
import { useNotes } from 'features/collaboration';
import type { Note } from 'features/collaboration';

interface SearchContextData {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  handleSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextData | undefined>(undefined);

/**
 * Convert chapters to search documents
 */
const createChapterSearchDocuments = (chapters: Chapter[]): SearchDocument[] => {
  return chapters.map(chapter => ({
    id: chapter.id,
    type: 'story' as SearchResultType,
    content: `${chapter.title} ${chapter.content} ${chapter.summary || ''}`,
    metadata: {
      title: chapter.title,
      order: chapter.order
    }
  }));
};

/**
 * Convert quests to search documents
 */
const createQuestSearchDocuments = (quests: Quest[]): SearchDocument[] => {
  return quests.map(quest => ({
    id: quest.id,
    type: 'quest' as SearchResultType,
    content: `${quest.title} ${quest.description} ${quest.objectives.map((obj: { description: string }) => obj.description).join(' ')}`,
    metadata: {
      title: quest.title,
      status: quest.status
    }
  }));
};

/**
 * Convert NPCs to search documents
 */
const createNPCSearchDocuments = (npcs: NPC[]): SearchDocument[] => {
  return npcs.map(npc => ({
    id: npc.id,
    type: 'npc' as SearchResultType,
    content: `${npc.name} ${npc.description} ${npc.background || ''} ${npc.occupation || ''}`,
    metadata: {
      title: npc.name,
      location: npc.location
    }
  }));
};

/**
 * Convert locations to search documents
 */
const createLocationSearchDocuments = (locations: Location[]): SearchDocument[] => {
  return locations.map(location => ({
    id: location.id,
    type: 'location' as SearchResultType,
    content: `${location.name} ${location.description} ${location.features?.join(' ')} ${location.tags?.join(' ')}`,
    metadata: {
      title: location.name,
      type: location.type,
      status: location.status
    }
  }));
};

/**
   * Convert rumors to search documents
   */
const createRumorSearchDocuments = (rumors: Rumor[]): SearchDocument[] => {
  return rumors.map(rumor => ({
    id: rumor.id,
    type: 'rumors' as SearchResultType,
    content: `${rumor.title} ${rumor.content} ${rumor.sourceName} ${rumor.notes.map(n => n.content).join(' ')}`,
    metadata: {
      title: rumor.title,
      status: rumor.status,
      source: rumor.sourceName
    }
  }));
};

/**
 * Convert notes to search documents
 */
const createNoteSearchDocuments = (notes: Note[]): SearchDocument[] => {
  return notes.map(note => ({
    id: note.id,
    type: 'note' as SearchResultType,
    content: `${note.title} ${note.content}`,
    metadata: {
      title: note.title
    }
  }));
};

/**
 * Provider component for global search functionality
 */
export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get data from all our collections
  const { chapters } = useChapterData();
  const { npcs } = useNPCData();
  const { locations } = useLocationData();
  const { quests } = useQuests();
  const { rumors } = useRumorData();
  const { notes } = useNotes();

  // Initialize SearchService with options
  const searchService = useMemo(() => new SearchService({
    contextLength: 50,
    minQueryLength: 2,
    maxResultsPerType: 5,
    fuzzyMatch: true
  }), []);

  // Initialize search index with available data
  useEffect(() => {
    const initializeSearch = () => {
      try {
        const searchDocuments: Record<SearchResultType, SearchDocument[]> = {
          story: createChapterSearchDocuments(chapters),
          quest: createQuestSearchDocuments(quests),
          npc: createNPCSearchDocuments(npcs),
          location: createLocationSearchDocuments(locations),
          rumors: createRumorSearchDocuments(rumors),
          note: createNoteSearchDocuments(notes)
        };

        searchService.initializeIndex(searchDocuments);
      } catch (error) {
        console.error('Error initializing search index:', error);
      }
    };

    // Collections load asynchronously and independently — the Phandelver
    // campaign, for example, has 0 rumors while every other collection is
    // populated. Gating on every collection being non-empty meant the index
    // was never built at all for a campaign missing just one type. Build the
    // index as soon as there is any data, and let it rebuild (safe: it
    // replaces the index wholesale) whenever a collection's contents change,
    // including a collection that started empty and later arrives with data.
    const totalDocs = chapters.length + quests.length + npcs.length + locations.length + rumors.length + notes.length;
    if (totalDocs === 0) {
      return;
    }
    initializeSearch();
  }, [searchService, chapters, quests, npcs, locations, rumors, notes]);

  // Tracks the most recently issued search request so a response to an
  // older, superseded query cannot overwrite a newer query's results.
  const latestRequestId = useRef(0);

  /**
   * Handle search query execution
   */
  const handleSearch = useCallback(async (searchQuery: string) => {
    const requestId = ++latestRequestId.current;
    setIsSearching(true);
    try {
      const searchResults = await searchService.search(searchQuery);
      if (requestId === latestRequestId.current) {
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error for query:', searchQuery, error);
      if (requestId === latestRequestId.current) {
        setResults([]);
      }
    } finally {
      if (requestId === latestRequestId.current) {
        setIsSearching(false);
      }
    }
  }, [searchService]);

  /**
   * Clear search state
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
  }, []);

  const value = useMemo(() => ({
    query,
    setQuery,
    results,
    isSearching,
    handleSearch,
    clearSearch
  }), [query, results, isSearching, handleSearch, clearSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

/**
 * Hook for accessing search context
 * @throws {Error} If used outside of SearchProvider
 */
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};