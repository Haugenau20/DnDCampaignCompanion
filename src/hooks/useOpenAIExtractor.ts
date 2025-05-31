// src/hooks/useOpenAIExtractor.ts
import { useState, useCallback } from "react";
import { ExtractedEntity } from "../types/note";
import EntityExtractionService from "../services/firebase/ai/EntityExtractionService";

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
   * @param model Optional model configuration
   * @returns Promise resolving to extracted entities
   */
  const extractEntities = useCallback(async (
    content: string,
    model?: string
  ): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const entities = await entityService.extractEntities(content, model);
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