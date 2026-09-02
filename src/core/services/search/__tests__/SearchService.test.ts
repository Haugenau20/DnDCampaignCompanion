// src/core/services/search/__tests__/SearchService.test.ts

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
    // Rewritten: subsequence matching now applies to titles only, never to
    // content. The original test put the subsequence in `content`, which is
    // exactly the unanchored `.*`-chain-over-chapter-bodies behaviour this
    // task removes. See report for before/after.
    test('should find results when fuzzyMatch=true and query characters appear in order in the title', () => {
      const svc = makeService({ fuzzyMatch: true });
      // 'gndf' is a subsequence of the title 'Gandalf the Grey' (g..n..d..f)
      svc.addDocument(makeDoc('n1', 'npc', 'A wizard of some renown', 'Gandalf the Grey'));
      const results = svc.search('gndf');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('n1');
    });

    test('should not find results with fuzzyMatch=false for non-substring query', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
      // 'gndf' is not a substring of 'gandalf the grey'
      const results = svc.search('gndf');
      expect(results).toEqual([]);
    });

    test('should not apply subsequence matching to content, even with fuzzyMatch=true', () => {
      const svc = makeService({ fuzzyMatch: true });
      // 'gndf' is a subsequence of the *content* but not the title, and is not
      // a real word-prefix match either - it must not match.
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Unrelated Title'));
      const results = svc.search('gndf');
      expect(results).toEqual([]);
    });

    test('a long scattered-letter content match is rejected (no .*-chain over content)', () => {
      const svc = makeService({ fuzzyMatch: true });
      // Build 2000+ chars of prose containing d, r, o, o, p in order but never
      // adjacent and never forming the word "droop".
      const filler = 'The party rested quietly near the river bank. '.repeat(50);
      const content =
        filler.slice(0, 200) +
        'A drawing of a rope lay on the ground, orbiting owls hooted, ' +
        filler.slice(200);
      expect(content.length).toBeGreaterThanOrEqual(2000);
      svc.addDocument(makeDoc('n1', 'npc', content, 'Unrelated Title'));
      const results = svc.search('droop');
      expect(results.find(r => r.id === 'n1')).toBeUndefined();
    });
  });

  // ─── regex-special characters in query ────────────────────────────────────

  describe('regex-special characters', () => {
    test('a lone "(" in the query does not throw', () => {
      const svc = makeService();
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
      expect(() => svc.search('(')).not.toThrow();
    });

    test('"a[" in the query does not throw', () => {
      const svc = makeService();
      svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
      expect(() => svc.search('a[')).not.toThrow();
    });

    test.each(['(', '[', '*', '+', '?', '\\'])(
      'query containing %s does not throw and returns an array',
      (char) => {
        const svc = makeService();
        svc.addDocument(makeDoc('n1', 'npc', 'Gandalf the Grey', 'Gandalf'));
        let results: unknown;
        expect(() => { results = svc.search(`a${char}b`); }).not.toThrow();
        expect(Array.isArray(results)).toBe(true);
      }
    );
  });

  // ─── extractMatches / contextLength ───────────────────────────────────────

  describe('match extraction', () => {
    test('should include a matching context snippet in matches array', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 10 });
      svc.addDocument(
        makeDoc('n1', 'npc', 'The wizard Gandalf defeated the Balrog', 'Gandalf')
      );
      const [result] = svc.search('Gandalf');
      expect(result.matches.length).toBeGreaterThan(0);
      // The match snippet should include the word
      expect(result.matches.some(m => m.toLowerCase().includes('gandalf'))).toBe(true);
    });

    // Content is assembled by the document builders as `${title} ${body} ...`,
    // so a document whose leading field is empty genuinely starts with
    // whitespace. Occurrence indices must therefore be computed against
    // untrimmed text -- trimming shifts every index left and the snippet gets
    // sliced in the wrong place.
    test('should slice the snippet correctly when content has leading whitespace', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 5 });
      // One leading space, as `${title} ${body}` produces when title is empty.
      // "Gandalf" starts at index 12 of the raw string, but at index 11 of a
      // trimmed copy -- so an implementation that indexes the trimmed text and
      // slices the raw text is off by exactly one character.
      svc.addDocument(
        makeDoc('n1', 'npc', ' The wizard Gandalf defeated the Balrog', 'Gandalf')
      );
      const [result] = svc.search('Gandalf');
      expect(result.matches[0]).toBe('zard Gandalf defe');
    });

    // Rewritten: there is now at most one snippet, so "deduplication" is
    // vacuous. Replaced with a cap assertion plus a matchCount assertion.
    // See report for before/after.
    test('should cap matches at one snippet and report the true occurrence count', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 5 });
      // "cat cat cat" → three occurrences of "cat"
      svc.addDocument(makeDoc('n1', 'npc', 'cat cat cat', 'Cats'));
      const [result] = svc.search('cat');
      expect(result.matches.length).toBeLessThanOrEqual(1);
      expect(result.matchCount).toBe(3);
    });

    test('a document with content matching the query 20 times returns one snippet and matchCount 20', () => {
      const svc = makeService({ fuzzyMatch: false, contextLength: 10 });
      const content = Array.from({ length: 20 }, () => 'obelisk').join(' stands near the ');
      svc.addDocument(makeDoc('n1', 'npc', content, 'Ruins'));
      const [result] = svc.search('obelisk');
      expect(result.matches.length).toBe(1);
      expect(result.matchCount).toBe(20);
    });

    test('word-prefix content match: "obel" matches "the obelisk hums"', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'the obelisk hums', 'Ruins'));
      const results = svc.search('obel');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('n1');
    });

    test('mid-word content match is not found: "belisk" does not match "the obelisk hums"', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'the obelisk hums', 'Unrelated'));
      const results = svc.search('belisk');
      expect(results).toEqual([]);
    });

    test('a document with no title match and no content snippet is dropped, not returned empty', () => {
      const svc = makeService({ fuzzyMatch: false });
      svc.addDocument(makeDoc('n1', 'npc', 'nothing relevant here', 'Also unrelated'));
      const results = svc.search('sauron');
      expect(results).toEqual([]);
    });
  });

  // ─── relevance scoring ────────────────────────────────────────────────────

  describe('relevance scoring', () => {
    // Strengthened: the original test only had two npc documents, so it could
    // pass even if scoring were wrong but grouping/order happened to line up.
    // Now scored explicitly against the query rather than a match snippet.
    test('title matches should rank higher than content-only matches', () => {
      const svc = makeService({ fuzzyMatch: false });
      // doc1: query only in content; doc2: query in title
      svc.addDocument(makeDoc('doc1', 'npc', 'Sauron is the dark lord', 'Villain'));
      svc.addDocument(makeDoc('doc2', 'npc', 'Some unrelated text here', 'Sauron'));
      const results = svc.search('Sauron');
      expect(results).toHaveLength(2);
      // doc2 has title match so should appear first
      expect(results[0].id).toBe('doc2');
    });

    test('a title match outranks a body mention globally, across different types', () => {
      const svc = makeService({ fuzzyMatch: false });
      // location document only mentions "droop" in content
      svc.addDocument(makeDoc('loc1', 'location', 'Droop was seen near this cave once', 'Hidden Cave'));
      // npc document has "Droop" as its title
      svc.addDocument(makeDoc('npc1', 'npc', 'A nervous gnome tinkerer', 'Droop'));
      const results = svc.search('droop');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].id).toBe('npc1');
      expect(results[0].type).toBe('npc');
    });
  });
});
