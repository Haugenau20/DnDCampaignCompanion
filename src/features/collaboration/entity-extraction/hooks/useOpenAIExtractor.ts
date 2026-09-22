// src/features/collaboration/entity-extraction/hooks/useOpenAIExtractor.ts
import { useState, useCallback } from "react";
import { ExtractedEntity } from "../../notes/types";
import EntityExtractionService from "../services/EntityExtractionService";

/**
 * Hook for extracting entities from text using Firebase Cloud Functions
 * Provides error handling and loading states
 */
export const useOpenAIExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entityService = EntityExtractionService.getInstance();
  
  /**
   * Extract entities from text content
   * @param content The text to analyze
   * @returns Promise resolving to extracted entities
   *
   * The model is pinned in the Cloud Function and is not a caller's choice --
   * this hook used to forward one, which is how the browser came to decide
   * what the project's OpenAI key was billed for.
   */
  const extractEntities = useCallback(async (
    content: string
  ): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const entities = await entityService.extractEntities(content);
      return entities;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract entities';
      setError(errorMessage);
      console.error('Entity extraction error:', err);
      return [];
    } finally {
      setIsExtracting(false);
    }
  }, [entityService]);
  
  return {
    extractEntities,
    isExtracting,
    error,
    resetError: () => setError(null)
  };
};