// src/utils/__tests__/search.test.ts

import { fuzzySearch, extractMatches, processSearchResults, groupResultsByType } from '../search';
import { SearchDocument, SearchResult } from '../../types/search';

describe('search', () => {
  describe('fuzzySearch', () => {
    test('should match exact substring', () => {
      expect(fuzzySearch('Hello world', 'world')).toBe(true);
    });

    test('should match characters in order even when not contiguous', () => {
      expect(fuzzySearch('Hello world', 'hwd')).toBe(true);
      expect(fuzzySearch('The Mountain Pass', 'mpass')).toBe(true);
    });

    test('should be case-insensitive', () => {
      expect(fuzzySearch('Hello World', 'HELLO')).toBe(true);
      expect(fuzzySearch('hello world', 'HELLO')).toBe(true);
    });

    test('should return false when characters appear out of order', () => {
      expect(fuzzySearch('abc', 'cab')).toBe(false);
    });

    test('should return true for empty query (regex matches anything)', () => {
      // Empty pattern matches any string
      expect(fuzzySearch('any text', '')).toBe(true);
    });

    test('should return false when text does not contain query characters', () => {
      expect(fuzzySearch('abc', 'xyz')).toBe(false);
    });
  });

  describe('extractMatches', () => {
    test('should extract context surrounding a match', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const result = extractMatches(text, 'fox', 5);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('fox');
    });

    test('should default contextLength to 50', () => {
      const text = 'a'.repeat(200) + 'NEEDLE' + 'b'.repeat(200);
      const result = extractMatches(text, 'NEEDLE');
      expect(result.length).toBe(1);
      // 50 chars before + needle + 50 chars after = 106
      expect(result[0].length).toBe(50 + 'NEEDLE'.length + 50);
      expect(result[0]).toContain('NEEDLE');
    });

    test('should find multiple matches of the same word', () => {
      const text = 'fox here, then fox over there, and fox again';
      const result = extractMatches(text, 'fox', 5);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    test('should be case-insensitive when matching', () => {
      const text = 'The Dragon flew over the dragon and DRAGON.';
      const result = extractMatches(text, 'dragon', 3);
      // 3 occurrences should be extracted (deduped if identical)
      expect(result.length).toBeGreaterThan(0);
      // Each match should contain some form of 'dragon' (preserving original casing)
      result.forEach((snippet) => {
        expect(snippet.toLowerCase()).toContain('dragon');
      });
    });

    test('should handle multi-word queries by searching each word', () => {
      const text = 'apple orange banana grape apple banana';
      const result = extractMatches(text, 'apple banana', 3);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return empty array when no matches', () => {
      const text = 'nothing to see here';
      const result = extractMatches(text, 'xyz');
      expect(result).toEqual([]);
    });

    test('should deduplicate identical extracted snippets', () => {
      const text = 'foo foo foo';
      const result = extractMatches(text, 'foo', 100);
      // All snippets identical (full text included due to large context) - deduped to 1
      expect(result.length).toBe(1);
    });

    test('should not exceed start/end boundaries of text', () => {
      const text = 'fox';
      const result = extractMatches(text, 'fox', 50);
      expect(result).toEqual(['fox']);
    });
  });

  describe('processSearchResults', () => {
    const documents: SearchDocument[] = [
      {
        id: '1',
        type: 'story',
        content: 'A tale of dragons and warriors',
        metadata: { title: 'The Dragon War' },
      },
      {
        id: '2',
        type: 'npc',
        content: 'A wise wizard who lives in the mountains',
        metadata: { title: 'Gandalf' },
      },
      {
        id: '3',
        type: 'location',
        content: 'A peaceful village by the river',
        metadata: { title: 'Riverdale' },
      },
    ];

    test('should filter documents matching the query', () => {
      const results = processSearchResults(documents, 'dragon');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    test('should attach title from metadata', () => {
      const results = processSearchResults(documents, 'dragon');
      expect(results[0].title).toBe('The Dragon War');
    });

    test('should attach matches snippets to each result', () => {
      const results = processSearchResults(documents, 'wizard');
      expect(results).toHaveLength(1);
      expect(Array.isArray(results[0].matches)).toBe(true);
      expect(results[0].matches.length).toBeGreaterThan(0);
    });

    test('should preserve id, type, and content fields on each result', () => {
      const results = processSearchResults(documents, 'village');
      expect(results[0]).toMatchObject({
        id: '3',
        type: 'location',
        content: 'A peaceful village by the river',
      });
    });

    test('should return empty array when no documents match', () => {
      const results = processSearchResults(documents, 'spaceship');
      expect(results).toEqual([]);
    });

    test('should return empty array when documents array is empty', () => {
      expect(processSearchResults([], 'anything')).toEqual([]);
    });
  });

  describe('groupResultsByType', () => {
    const results: SearchResult[] = [
      { id: '1', type: 'story', title: 'S1', content: '', matches: [] },
      { id: '2', type: 'npc', title: 'N1', content: '', matches: [] },
      { id: '3', type: 'npc', title: 'N2', content: '', matches: [] },
      { id: '4', type: 'location', title: 'L1', content: '', matches: [] },
    ];

    test('should group results by their type', () => {
      const grouped = groupResultsByType(results);
      expect(grouped.story).toHaveLength(1);
      expect(grouped.npc).toHaveLength(2);
      expect(grouped.location).toHaveLength(1);
    });

    test('should not include groups for types with no results', () => {
      const grouped = groupResultsByType(results);
      expect(grouped.quest).toBeUndefined();
      expect(grouped.rumors).toBeUndefined();
    });

    test('should preserve order of results within each group', () => {
      const grouped = groupResultsByType(results);
      expect(grouped.npc[0].id).toBe('2');
      expect(grouped.npc[1].id).toBe('3');
    });

    test('should return empty object when no results', () => {
      const grouped = groupResultsByType([]);
      expect(grouped).toEqual({});
    });
  });
});
