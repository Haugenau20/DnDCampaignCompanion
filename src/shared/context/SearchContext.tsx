// context/SearchContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SearchResult, SearchResultType, SearchDocument } from 'core/types/search';
import { SearchService } from 'core/services/search/SearchService';
import { useStory } from 'features/storytelling';
import type { Chapter } from 'features/storytelling';
import { useNPCs } from 'features/campaign-entities';
import { useLocations } from 'features/campaign-entities';
import { useQuests, Quest } from 'features/campaign-entities';
import { NPC } from 'features/campaign-entities';
import type { Location } from 'features/campaign-entities';
import { Rumor } from 'features/campaign-entities';
import { useRumors } from 'features/campaign-entities';
import { useNotes, displayTitle as noteDisplayTitle } from 'features/collaboration';
import type { Note } from 'features/collaboration';
import { rumorTitleText } from 'features/campaign-entities';
import { useListenerDemand, RetainListener } from 'shared/hooks/useListenerDemand';

interface SearchContextData {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  isIndexReady: boolean;
  /**
   * Bumped every time the index is rebuilt or cleared, so whoever shows
   * results can run the query on screen again (REACT-007): a query typed
   * before the data arrived would otherwise keep its empty answer.
   */
  indexVersion: number;
  handleSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  /**
   * Hold the collections open for searching while the caller is mounted
   * (T032, `PERF-03`). The header search is on every route, so the index is
   * built only once someone opens it, not on every page load.
   */
  retainIndex: RetainListener;
}

const SearchContext = createContext<SearchContextData | undefined>(undefined);

/**
 * Convert chapters to search documents
 */
const createChapterSearchDocuments = (chapters: Chapter[]): SearchDocument[] => {
  return chapters.map(chapter => ({
    id: chapter.id,
    type: 'story' as SearchResultType,
    // The title and summary: the text is a document of its own, read where a
    // chapter is opened (T134), so search no longer downloads the book.
    content: `${chapter.title} ${chapter.summary || ''}`,
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
   * Convert rumors to search documents. A rumour's notes are documents of
   * their own (T133), read where the rumour is opened, and not searched; only
   * conversions and combinations write them.
   */
const createRumorSearchDocuments = (rumors: Rumor[]): SearchDocument[] => {
  return rumors.map(rumor => ({
    id: rumor.id,
    type: 'rumors' as SearchResultType,
    content: `${rumorTitleText(rumor)} ${rumor.content} ${rumor.sourceName}`,
    metadata: {
      title: rumorTitleText(rumor),
      status: rumor.status,
      source: rumor.sourceName
    }
  }));
};

/**
 * Convert notes to search documents. A note with no title is named the way
 * its own list names it, from its content (DUP-001); the raw title is blank.
 */
const createNoteSearchDocuments = (notes: Note[]): SearchDocument[] => {
  return notes.map(note => ({
    id: note.id,
    type: 'note' as SearchResultType,
    content: `${note.title} ${note.content}`,
    metadata: {
      title: noteDisplayTitle(note) ?? 'Untitled note'
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
  // Whether the index has been built at least once. Before it has, an empty
  // `results` array is indistinguishable from a genuine miss -- which is the
  // state the palette must render as a skeleton rather than as "no results".
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [indexVersion, setIndexVersion] = useState(0);

  // Every collection comes from the provider that owns it. SearchProvider is
  // mounted inside all six (App.tsx), so building private loaders here only
  // produced a second fetch of each collection -- and an index that went stale
  // after a write, because the providers' copies were not the ones indexed.
  //
  // They are only read while the search is open (`PERF-03`): mounting this
  // provider on every route must not open six listeners on every route. No
  // linger here -- each provider keeps its own listener open for a while
  // after, so reopening the search soon after is free.
  const searching = useListenerDemand(0);
  const reading = { subscribe: searching.wanted };
  const { chapters, isLoading: chaptersLoading } = useStory(reading);
  const { npcs, isLoading: npcsLoading } = useNPCs(reading);
  const { locations, isLoading: locationsLoading } = useLocations(reading);
  const { quests, isLoading: questsLoading } = useQuests(reading);
  const { rumors, isLoading: rumorsLoading } = useRumors(reading);
  const { notes, isLoading: notesLoading } = useNotes(reading);
  // Whether any collection is still waiting for its first snapshot -- after a
  // campaign switch, too. An empty array alone cannot say "nothing here" from
  // "nothing yet" (REACT-006).
  const anyLoading = Boolean(
    chaptersLoading || npcsLoading || locationsLoading || questsLoading || rumorsLoading || notesLoading
  );

  // Initialize SearchService with options
  const searchService = useMemo(() => new SearchService({
    contextLength: 50,
    minQueryLength: 2,
    maxResultsPerType: 5,
    fuzzyMatch: true
  }), []);

  // Build the index from what is loaded, once everything has loaded.
  //
  // Collections load asynchronously and independently, and any of them may
  // be legitimately empty -- the Phandelver campaign has 0 rumours. So the
  // gate is whether loading has finished, not whether there is data: it used
  // to be "any document at all", which left an empty campaign's search loading
  // forever and kept a campaign's old records searchable once it dropped to
  // none (REACT-006). Nothing loaded means an empty index, not no index.
  useEffect(() => {
    if (anyLoading) {
      setIsIndexReady(false);
      return;
    }
    try {
      const searchDocuments: Record<SearchResultType, SearchDocument[]> = {
        story: createChapterSearchDocuments(chapters),
        quest: createQuestSearchDocuments(quests),
        npc: createNPCSearchDocuments(npcs),
        location: createLocationSearchDocuments(locations),
        rumors: createRumorSearchDocuments(rumors),
        note: createNoteSearchDocuments(notes)
      };
      const total = Object.values(searchDocuments).reduce((sum, docs) => sum + docs.length, 0);
      if (total === 0) {
        searchService.clearIndex();
      } else {
        // Safe to repeat: it replaces the index wholesale.
        searchService.initializeIndex(searchDocuments);
      }
      setIsIndexReady(true);
      setIndexVersion(version => version + 1);
    } catch (error) {
      console.error('Error initializing search index:', error);
    }
  }, [searchService, anyLoading, chapters, quests, npcs, locations, rumors, notes]);

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
    isIndexReady,
    indexVersion,
    handleSearch,
    clearSearch,
    retainIndex: searching.retain
  }), [query, results, isSearching, isIndexReady, indexVersion, handleSearch, clearSearch, searching.retain]);

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