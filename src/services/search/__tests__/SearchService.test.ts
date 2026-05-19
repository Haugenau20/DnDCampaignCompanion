// src/services/search/__tests__/SearchService.test.ts

import { SearchService, SearchOptions } from '../SearchService';
import { SearchDocument, SearchResultType } from '../../../types/search';

/**
 * Tests for SearchService
 *
 * SearchService is a pure in-memory search engine with no Firebase dependency.
 * All branches (fuzzy, exact, relevance scoring, batching) are tested here.
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeDoc(
  id: string,
  type: SearchResultType,
  content: string,
  title: string = ''
): SearchDocument {
  return { id, type, content, metadata: { title } };
}

function makeService(options: SearchOptions = {}): SearchService {
  return new SearchService(options);
}

// ─── Constructor / options ────────────────────────────────────────────────────

describe('SearchService', () => {
  describe('constructor', () => {
    test('should instantiate without arguments', () => {
      expect(() => new SearchService()).not.toThrow();
    });

    test('should accept custom options', () => {
      expect(
        () => new SearchService({ contextLength: 20, minQueryLength: 3, maxResultsPerType: 5 })
      ).not.toThrow();
    });
  });

  // ─── initializeIndex ────────────────────────────────────────────────────────

  describe('initializeIndex', () => {
    test('should accept a record of type → document arrays', () => {
      const svc = makeService();
      expect(() =>
        svc.initializeIndex({
          npc: [makeDoc('n1', 'npc', 'Gandalf the wizard')],
          location: [],
          quest: [],
          story: [],
          rumors: [],
        })
      ).not.toThrow();
    });

    test('should make documents searchable after initialization', () => {
      const svc = makeService();
      svc.initializeIndex({
        npc: [makeDoc('n1', 'npc', 'Aragorn ranger king', 'Aragorn')],
        location: [],
        quest: [],
        story: [],
        rumors: [],
      });
      const results = svc.search('aragorn');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ─── search ─────────────────────────────────────────────────────────────────

  describe('search', () => {
    test('should return empty array for empty query', () => {
      const svc = makeService();
      svc.initializeIndex({ npc: [makeDoc('n1', 'npc', 'Gandalf')], location: [], quest: [], story: [], rumors: [] });
      expect(svc.search('')).toEqual([]);
    });

    test('should return empty array when query is shorter than minQueryLength (default 2)', () => {
      const svc = makeService();
      svc.initializeIndex({ npc: [makeDoc('n1', 'npc', 'Gandalf')], location: [], quest: [], story: [], rumors: [] });
      expect(svc.search('G')).toEqual([]);
    });

    test('should return results when query meets minQueryLength', () => {
      const svc = makeService();
      svc.initializeIndex({
        npc: [makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf')],
        location: [], quest: [], story: [], rumors: [],
      });
      const results = svc.search('Ga');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should respect custom minQueryLength option', () => {
      const svc = makeService({ minQueryLength: 4 });
      svc.initializeIndex({ npc: [makeDoc('n1', 'npc', 'Gandalf')], location: [], quest: [], story: [], rumors: [] });
      // 3-char query is below threshold
      expect(svc.search('Gan')).toEqual([]);
      // 4-char query meets threshold
      expect(svc.search('Gand').length).toBeGreaterThan(0);
    });

    test('should return results from all document types', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.initializeIndex({
        npc: [makeDoc('n1', 'npc', 'dragon warrior', 'Dragon NPC')],
        location: [makeDoc('l1', 'location', 'dragon cave', 'Dragon Cave')],
        quest: [],
        story: [],
        rumors: [],
      });
      const results = svc.search('dragon');
      const types = results.map(r => r.type);
      expect(types).toContain('npc');
      expect(types).toContain('location');
    });

    test('should not return documents that do not match the query', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.initializeIndex({
        npc: [makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf')],
        location: [],
        quest: [],
        story: [],
        rumors: [],
      });
      const results = svc.search('Sauron');
      expect(results).toEqual([]);
    });

    test('should perform title match (title matches are prioritised)', () => {
      const svc = makeService({ fuzzyMatch: false });
      const doc = makeDoc('n1', 'npc', 'Some unrelated content', 'Frodo Baggins');
      svc.initializeIndex({ npc: [doc], location: [], quest: [], story: [], rumors: [] });
      const results = svc.search('Frodo');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('n1');
    });

    test('result objects should have id, type, title, content, matches fields', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.initializeIndex({
        npc: [makeDoc('n1', 'npc', 'Hobbit from the Shire', 'Frodo')],
        location: [], quest: [], story: [], rumors: [],
      });
      const [result] = svc.search('Frodo');
      expect(result).toHaveProperty('id', 'n1');
      expect(result).toHaveProperty('type', 'npc');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('matches');
      expect(Array.isArray(result.matches)).toBe(true);
    });

    test('should limit results per type to maxResultsPerType', () => {
      const svc = makeService({ maxResultsPerType: 2, fuzzyMatch: false });
      const docs = Array.from({ length: 10 }, (_, i) =>
        makeDoc(`n${i}`, 'npc', `warrior hero ${i}`, `Hero ${i}`)
      );
      svc.initializeIndex({ npc: docs, location: [], quest: [], story: [], rumors: [] });
      const results = svc.search('hero');
      // Should be at most 2 for npc type
      const npcResults = results.filter(r => r.type === 'npc');
      expect(npcResults.length).toBeLessThanOrEqual(2);
    });
  });

  // ─── addDocument ───────────────────────────────────────────────────────────

  describe('addDocument', () => {
    test('should add a document to the index so it becomes searchable', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'Legolas the elf', 'Legolas'));
      const results = svc.search('Legolas');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('n1');
    });

    test('should add documents of different types independently', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'dark lord', 'Sauron'));
      svc.addDocument(makeDoc('l1', 'location', 'dark tower', 'Barad-dur'));
      const results = svc.search('dark');
      const types = results.map(r => r.type);
      expect(types).toContain('npc');
      expect(types).toContain('location');
    });
  });

  // ─── removeDocument ────────────────────────────────────────────────────────

  describe('removeDocument', () => {
    test('should remove a document so it no longer appears in search results', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'Gimli the dwarf', 'Gimli'));
      svc.addDocument(makeDoc('n2', 'npc', 'Gimli son of Gloin', 'Gimli Jr'));

      svc.removeDocument('npc', 'n1');
      const results = svc.search('Gimli');
      expect(results.find(r => r.id === 'n1')).toBeUndefined();
      expect(results.find(r => r.id === 'n2')).toBeDefined();
    });

    test('should not throw when removing a non-existent document', () => {
      const svc = makeService();
      expect(() => svc.removeDocument('npc', 'nonexistent')).not.toThrow();
    });

    test('should not throw when removing from a type with no documents', () => {
      const svc = makeService();
      expect(() => svc.removeDocument('quest', 'q1')).not.toThrow();
    });
  });

  // ─── clearIndex ────────────────────────────────────────────────────────────

  describe('clearIndex', () => {
    test('should remove all documents so search returns empty', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'Aragorn', 'Aragorn'));
      svc.addDocument(makeDoc('l1', 'location', 'Gondor', 'Gondor'));
      svc.clearIndex();
      expect(svc.search('Aragorn')).toEqual([]);
      expect(svc.search('Gondor')).toEqual([]);
    });
  });

  // ─── fuzzy matching ────────────────────────────────────────────────────────

  describe('fuzzyMatch option', () => {
    test('should find results when fuzzyMatch=true and query characters appear in order', () => {
      const svc = makeService({ fuzzyMatch: true });
      // 'grdn' should fuzzy-match 'Gandalf' if g,r,d,n appear in sequence
      // Actually 'Gandalf': g-a-n-d-a-l-f → 'gn' should match
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
      const results = svc.search('gndf'); // g..n..d..f in Gandalf
      expect(results.length).toBeGreaterThan(0);
    });

    test('should not find results with fuzzyMatch=false for non-substring query', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
      // 'gndf' is not a substring of 'gandalf the grey'
      const results = svc.search('gndf');
      expect(results).toEqual([]);
    });
  });

  // ─── extractMatches / contextLength ───────────────────────────────────────

  describe('match extraction', () => {
    test('should include matching context snippets in matches array', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 10 });
      svc.addDocument(
        makeDoc('n1', 'npc', 'The wizard Gandalf defeated the Balrog', 'Gandalf')
      );
      const [result] = svc.search('Gandalf');
      expect(result.matches.length).toBeGreaterThan(0);
      // The match snippet should include the word
      expect(result.matches.some(m => m.toLowerCase().includes('gandalf'))).toBe(true);
    });

    test('should deduplicate identical match snippets', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 5 });
      // "cat cat cat" → multiple occurrences of "cat"
      svc.addDocument(makeDoc('n1', 'npc', 'cat cat cat', 'Cats'));
      const [result] = svc.search('cat');
      // Matches should not contain duplicates (lodash _.uniq is applied)
      const unique = [...new Set(result.matches)];
      expect(result.matches.length).toBe(unique.length);
    });
  });

  // ─── relevance scoring ────────────────────────────────────────────────────

  describe('relevance scoring', () => {
    test('title matches should rank higher than content-only matches', () => {
      const svc = makeService({ fuzzyMatch: false });
      // doc1: query only in content; doc2: query in title
      svc.addDocument(makeDoc('doc1', 'npc', 'Sauron is the dark lord', 'Villain'));
      svc.addDocument(makeDoc('doc2', 'npc', 'Some unrelated text here', 'Sauron'));
      const results = svc.search('Sauron');
      // doc2 has title match so should appear first
      expect(results[0].id).toBe('doc2');
    });
  });
});
