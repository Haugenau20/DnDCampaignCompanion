// context/SearchContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { SearchResult, SearchResultType, SearchDocument } from '../types/search';
import { SearchService } from '../services/search/SearchService';
import { useStory } from '../context/StoryContext';
import { useNPCs } from '../context/NPCContext';
import { useLocations } from '../context/LocationContext';
import { useQuests } from '../context/QuestContext';
import { Chapter } from '../types/story';
import { Quest } from '../types/quest';
import { NPC } from '../types/npc';
import { Location } from '../types/location';
import { Rumor } from '../types/rumor';
import { useRumors } from '../context/RumorContext';

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
 * Provider component for global search functionality
 */
export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get data from all our collections
  const { items: chapters } = useStory();
  const { items: npcs } = useNPCs();
  const { locations } = useLocations();
  const { items: quests } = useQuests();
  const { rumors } = useRumors();

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
          rumors: createRumorSearchDocuments(rumors)
        };

        searchService.initializeIndex(searchDocuments);
      } catch (error) {
        console.error('Error initializing search index:', error);
      }
    };

    // Only initialize if we have all the data
    if (chapters.length && quests.length && npcs.length && locations.length && rumors.length) {
      initializeSearch();
    }
  }, [searchService, chapters, quests, npcs, locations, rumors]);

  /**
   * Handle search query execution
   */
  const handleSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const searchResults = searchService.search(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
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