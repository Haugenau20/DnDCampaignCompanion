// src/core/types/search.ts
/** The domain a search result belongs to. */
export type SearchResultType = 'story' | 'quest' | 'npc' | 'location' | 'rumors' | 'note';

/**
 * A single search result surfaced to the UI: at most one context snippet
 * (`matches`), plus the total number of content occurrences found (`matchCount`).
 */
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  matches: string[];
  /** Total number of content occurrences found, of which `matches` carries at most one. */
  matchCount: number;
}

/** A document as stored in the in-memory search index, before scoring. */
export interface SearchDocument {
  id: string;
  type: SearchResultType;
  content: string;
  metadata: Record<string, unknown>;
}