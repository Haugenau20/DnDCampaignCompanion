// src/services/search/SearchService.ts
import { SearchResult, SearchResultType, SearchDocument } from '../../types/search';
import _ from 'lodash';

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

    return this.processResults(results);
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
   * Search through a set of documents
   */
  private searchDocuments(documents: SearchDocument[], query: string): SearchResult[] {
    return documents
      .filter(doc => this.matchDocument(doc, query))
      .map(doc => this.createSearchResult(doc, query));
  }

  /**
   * Check if a document matches the search query
   */
  private matchDocument(document: SearchDocument, query: string): boolean {
    const searchText = this.prepareText(document.content);
    const searchQuery = this.prepareText(query);
    const titleText = this.prepareText(document.metadata.title as string);

    // Give higher priority to title matches
    if (titleText.includes(searchQuery)) {
      return true;
    }

    if (this.options.fuzzyMatch) {
      return this.fuzzyMatch(searchText, searchQuery);
    }

    return searchText.includes(searchQuery);
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevance(document: SearchDocument, query: string): number {
    const normalizedQuery = this.prepareText(query);
    const titleText = this.prepareText(document.metadata.title as string);
    const contentText = this.prepareText(document.content);
    
    let score = 0;
    
    // Title matches are weighted heavily
    if (titleText.includes(normalizedQuery)) {
      score += 100;
    }
    
    // Exact content matches
    if (contentText.includes(normalizedQuery)) {
      score += 50;
    }
    
    // Partial matches
    const words = normalizedQuery.split(' ');
    words.forEach(word => {
      if (titleText.includes(word)) score += 10;
      if (contentText.includes(word)) score += 5;
    });
    
    return score;
  }

  /**
   * Create a formatted search result from a matching document
   */
  private createSearchResult(document: SearchDocument, query: string): SearchResult {
    return {
      id: document.id,
      type: document.type,
      title: document.metadata.title as string || '',
      content: document.content,
      matches: this.extractMatches(document.content, query)
    };
  }

  /**
   * Extract matching text segments with surrounding context
   */
  private extractMatches(text: string, query: string): string[] {
    const contextLength = this.options.contextLength || 50;
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

    return _.uniq(matches);
  }

  /**
   * Perform fuzzy matching between text and query
   */
  private fuzzyMatch(text: string, query: string): boolean {
    const words = query.split(' ');
    return words.every(word => {
      const pattern = word.split('').join('.*');
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    });
  }

  /**
   * Prepare text for searching by normalizing
   */
  private prepareText(text: string): string {
    return text.toLowerCase().trim();
  }

  /**
   * Process and sort search results
   */
  private processResults(results: SearchResult[]): SearchResult[] {
    const maxResults = this.options.maxResultsPerType || 10;
    
    // Calculate relevance scores for all results
    const scoredResults = results.map(result => ({
      ...result,
      relevance: this.calculateRelevance({ 
        id: result.id, 
        type: result.type, 
        content: result.content, 
        metadata: { title: result.title } 
      }, result.matches[0] || '')
    }));
    
    // Group by type
    const groupedResults = _.groupBy(scoredResults, 'type');
    
    // Sort each group by relevance and limit results
    return _.flatMap(groupedResults, typeResults => 
      typeResults
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults)
        .map(({ relevance, ...result }) => result)
    );
  }
}

export default SearchService;