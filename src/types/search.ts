// types/search.ts
export type SearchResultType = 'story' | 'quest' | 'npc' | 'location' | 'rumors';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  matches: string[];
}

export interface SearchIndex {
  story: SearchDocument[];
  quests: SearchDocument[];
  npcs: SearchDocument[];
  locations: SearchDocument[];
  rumors: SearchDocument[];
}

export interface SearchDocument {
  id: string;
  type: SearchResultType;
  content: string;
  metadata: Record<string, unknown>;
}