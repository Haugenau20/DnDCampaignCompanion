// utils/search.ts
import { SearchResult, SearchResultType, SearchDocument } from '../types/search';

/**
 * Performs fuzzy search on the provided text
 * @param text - Text to search within
 * @param query - Search query
 * @returns boolean indicating if the text matches the query
 */
export const fuzzySearch = (text: string, query: string): boolean => {
  const pattern = query.split('').join('.*');
  const regex = new RegExp(pattern, 'i');
  return regex.test(text);
};

/**
 * Extracts matching context around search terms
 * @param text - Full text content
 * @param query - Search query
 * @param contextLength - Number of characters of context to include
 * @returns Array of text snippets containing matches
 */
export const extractMatches = (
  text: string, 
  query: string, 
  contextLength: number = 50
): string[] => {
  const matches: string[] = [];
  const words = query.toLowerCase().split(' ');
  const textLower = text.toLowerCase();

  words.forEach(word => {
    let index = textLower.indexOf(word);
    while (index !== -1) {
      const start = Math.max(0, index - contextLength);
      const end = Math.min(text.length, index + word.length + contextLength);
      matches.push(text.slice(start, end));
      index = textLower.indexOf(word, index + 1);
    }
  });

  return [...new Set(matches)]; // Remove duplicates
};

/**
 * Processes raw search documents into formatted search results
 * @param documents - Array of search documents
 * @param query - Search query
 * @returns Array of formatted search results
 */
export const processSearchResults = (
  documents: SearchDocument[],
  query: string
): SearchResult[] => {
  return documents
    .filter(doc => fuzzySearch(doc.content, query))
    .map(doc => ({
      id: doc.id,
      type: doc.type,
      title: doc.metadata.title as string,
      content: doc.content,
      matches: extractMatches(doc.content, query)
    }));
};

/**
 * Groups search results by their type
 * @param results - Array of search results
 * @returns Object with results grouped by type
 */
export const groupResultsByType = (
  results: SearchResult[]
): Record<SearchResultType, SearchResult[]> => {
  return results.reduce((groups, result) => {
    if (!groups[result.type]) {
      groups[result.type] = [];
    }
    groups[result.type].push(result);
    return groups;
  }, {} as Record<SearchResultType, SearchResult[]>);
};