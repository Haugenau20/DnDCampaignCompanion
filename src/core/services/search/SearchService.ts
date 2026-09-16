// src/core/services/search/SearchService.ts
import { SearchResult, SearchResultType, SearchDocument } from '../../types/search';

/**
 * Options for configuring search behavior
 */
export interface SearchOptions {
  /** Number of characters of context to include around matches */
  contextLength?: number;
  /** Minimum length of search query */
  minQueryLength?: number;
  /** Maximum number of results per category */
  maxResultsPerType?: number;
  /** Whether to use fuzzy matching */
  fuzzyMatch?: boolean;
}

/**
 * Default search configuration options
 */
const DEFAULT_OPTIONS: SearchOptions = {
  contextLength: 50,
  minQueryLength: 2,
  maxResultsPerType: 10,
  fuzzyMatch: true
};

/**
 * Service class for handling search functionality across the application
 */
export class SearchService {
  private searchIndex: Map<SearchResultType, SearchDocument[]>;
  private options: SearchOptions;

  constructor(options: SearchOptions = {}) {
    this.searchIndex = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize the search index with documents
   */
  public initializeIndex(documents: Record<SearchResultType, SearchDocument[]>): void {
    Object.entries(documents).forEach(([type, docs]) => {
      this.searchIndex.set(type as SearchResultType, docs);
    });
  }

  /**
   * Perform a search across all indexed documents
   */
  public search(query: string): SearchResult[] {
    if (!query || query.length < (this.options.minQueryLength || 2)) {
      return [];
    }

    const results: SearchResult[] = [];
    this.searchIndex.forEach((documents, type) => {
      const typeResults = this.searchDocuments(documents, query);
      results.push(...typeResults);
    });

    return this.processResults(results, query);
  }

  /**
   * Add a new document to the search index
   */
  public addDocument(document: SearchDocument): void {
    const documents = this.searchIndex.get(document.type) || [];
    documents.push(document);
    this.searchIndex.set(document.type, documents);
  }

  /**
   * Remove a document from the search index
   */
  public removeDocument(type: SearchResultType, id: string): void {
    const documents = this.searchIndex.get(type);
    if (documents) {
      this.searchIndex.set(
        type,
        documents.filter(doc => doc.id !== id)
      );
    }
  }

  /**
   * Clear the entire search index
   */
  public clearIndex(): void {
    this.searchIndex.clear();
  }

  /**
   * Search through a set of documents, discarding any result that has
   * nothing to show for itself (no title match and no content snippet).
   */
  private searchDocuments(documents: SearchDocument[], query: string): SearchResult[] {
    return documents
      .filter(doc => this.matchDocument(doc, query))
      .map(doc => this.createSearchResult(doc, query))
      .filter(result => result.matches.length > 0 || this.titleMatches(result.title, query));
  }

  /**
   * Check whether a document's title matches the query, either as a literal
   * substring or (when fuzzy matching is enabled) as a subsequence.
   */
  private titleMatches(title: string, query: string): boolean {
    const titleText = this.prepareText(title);
    const searchQuery = this.prepareText(query);

    if (titleText.includes(searchQuery)) {
      return true;
    }

    return Boolean(this.options.fuzzyMatch) && this.isSubsequence(titleText, searchQuery);
  }

  /**
   * Check if a document matches the search query. Title matching allows a
   * literal substring or, when fuzzy matching is enabled, a subsequence
   * match (typo tolerance). Content matching is always literal and
   * word-prefix anchored - never a subsequence - to avoid manufacturing
   * false positives against long document bodies.
   */
  private matchDocument(document: SearchDocument, query: string): boolean {
    const searchQuery = this.prepareText(query);

    if (this.titleMatches(document.metadata.title as string, query)) {
      return true;
    }

    const content = this.prepareText(document.content);
    const words = searchQuery.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return false;
    }

    return words.every(word => this.findWordMatches(content, word).length > 0);
  }

  /**
   * Calculate relevance score for search results. Title matches (especially
   * exact or prefix ones) are weighted well above content matches, and the
   * score is always computed against the real query - never a snippet of
   * the document's own text.
   */
  private calculateRelevance(document: SearchDocument, query: string): number {
    const normalizedQuery = this.prepareText(query);
    const titleText = this.prepareText(document.metadata.title as string);
    const contentText = this.prepareText(document.content);

    let score = 0;

    // An exact title match outranks everything else.
    if (titleText === normalizedQuery) {
      score += 200;
    } else if (titleText.startsWith(normalizedQuery)) {
      score += 50;
    }

    // Title matches are weighted heavily
    if (titleText.includes(normalizedQuery)) {
      score += 100;
    }

    // Exact content matches
    if (contentText.includes(normalizedQuery)) {
      score += 50;
    }

    // Partial matches
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    words.forEach(word => {
      if (titleText.includes(word)) score += 10;
      if (contentText.includes(word)) score += 5;
    });

    return score;
  }

  /**
   * Create a formatted search result from a matching document: one context
   * snippet (if any) plus the total number of content occurrences found.
   */
  private createSearchResult(document: SearchDocument, query: string): SearchResult {
    const { snippet, count } = this.extractMatches(document.content, query);
    return {
      id: document.id,
      type: document.type,
      title: document.metadata.title as string || '',
      content: document.content,
      matches: snippet ? [snippet] : [],
      matchCount: count
    };
  }

  /**
   * Find every content occurrence of the query's words and return a single
   * best snippet plus the total occurrence count. The best occurrence is an
   * occurrence of the full query string if one exists, otherwise the
   * earliest occurrence of the longest query word.
   */
  private extractMatches(text: string, query: string): { snippet: string | null; count: number } {
    const contextLength = this.options.contextLength || 50;
    // Lowercased but deliberately NOT trimmed: the indices found here are
    // sliced back out of the original `text`, so `prepareText`'s trim() would
    // shift every index left by the number of leading whitespace characters
    // and cut the snippet in the wrong place. Content is assembled by the
    // document builders as `${title} ${body} ...`, so a document with an empty
    // leading field really does start with whitespace.
    const preparedContent = text.toLowerCase();
    const preparedQuery = this.prepareText(query);
    const words = preparedQuery.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return { snippet: null, count: 0 };
    }

    // Occurrences are keyed by start index so two words matching at the
    // same offset are not double-counted.
    const occurrencesByIndex = new Map<number, string>();
    words.forEach(word => {
      this.findWordMatches(preparedContent, word).forEach(index => {
        if (!occurrencesByIndex.has(index)) {
          occurrencesByIndex.set(index, word);
        }
      });
    });

    const count = occurrencesByIndex.size;
    if (count === 0) {
      return { snippet: null, count: 0 };
    }

    const fullQueryIndices = this.findWordMatches(preparedContent, preparedQuery);
    let bestIndex: number;
    let bestLength: number;

    if (fullQueryIndices.length > 0) {
      bestIndex = fullQueryIndices[0];
      bestLength = preparedQuery.length;
    } else {
      const longestWord = [...words].sort((a, b) => b.length - a.length)[0];
      const longestWordIndices = Array.from(occurrencesByIndex.entries())
        .filter(([, word]) => word === longestWord)
        .map(([index]) => index)
        .sort((a, b) => a - b);
      const fallbackIndices = Array.from(occurrencesByIndex.keys()).sort((a, b) => a - b);
      bestIndex = longestWordIndices.length > 0 ? longestWordIndices[0] : fallbackIndices[0];
      bestLength = longestWord.length;
    }

    const start = Math.max(0, bestIndex - contextLength);
    const end = Math.min(text.length, bestIndex + bestLength + contextLength);
    const snippet = text.slice(start, end);

    return { snippet, count };
  }

  /**
   * Two-pointer scan checking whether every character of `needle` appears in
   * `haystack`, in order (not necessarily contiguously). Used for title
   * typo-tolerant matching only - never against content, where it would
   * manufacture false positives over long document bodies.
   */
  private isSubsequence(haystack: string, needle: string): boolean {
    if (needle.length === 0) {
      return true;
    }

    let needleIndex = 0;
    for (let i = 0; i < haystack.length && needleIndex < needle.length; i++) {
      if (haystack[i] === needle[needleIndex]) {
        needleIndex++;
      }
    }

    return needleIndex === needle.length;
  }

  /**
   * Find every start index in `content` where `word` occurs as a literal,
   * word-prefix-anchored match: the occurrence must start at index 0 or be
   * preceded by a non-word character. This is what lets "obel" match
   * "obelisk" while "belisk" does not. Both arguments are expected to
   * already be prepared (lowercased, trimmed) text.
   */
  private findWordMatches(content: string, word: string): number[] {
    if (!word) {
      return [];
    }

    const indices: number[] = [];
    let index = content.indexOf(word);
    while (index !== -1) {
      const precedingChar = index === 0 ? '' : content[index - 1];
      if (index === 0 || /\W/.test(precedingChar)) {
        indices.push(index);
      }
      index = content.indexOf(word, index + 1);
    }

    return indices;
  }

  /**
   * Prepare text for searching by normalizing
   */
  private prepareText(text: string): string {
    return text.toLowerCase().trim();
  }

  /**
   * Process and sort search results: score every result against the real
   * query, sort the whole list by relevance (globally, not per type, tie-
   * broken by title so ordering is stable), then cap the sorted list to at
   * most `maxResultsPerType` results per type while preserving that order.
   */
  private processResults(results: SearchResult[], query: string): SearchResult[] {
    const maxResults = this.options.maxResultsPerType || 10;

    const scoredResults = results.map(result => ({
      ...result,
      relevance: this.calculateRelevance({
        id: result.id,
        type: result.type,
        content: result.content,
        metadata: { title: result.title }
      }, query)
    }));

    scoredResults.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.title.localeCompare(b.title);
    });

    const perTypeCounts = new Map<SearchResultType, number>();
    const capped: SearchResult[] = [];

    for (const { relevance, ...result } of scoredResults) {
      const typeCount = perTypeCounts.get(result.type) || 0;
      if (typeCount >= maxResults) {
        continue;
      }
      perTypeCounts.set(result.type, typeCount + 1);
      capped.push(result);
    }

    return capped;
  }
}

export default SearchService;