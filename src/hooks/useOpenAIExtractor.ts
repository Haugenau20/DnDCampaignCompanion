// src/hooks/useOpenAIExtractor.ts
import { useState, useCallback } from "react";
import { ExtractedEntity } from "../types/note";
import { extractEntitiesFromNote } from "../services/openai/entityExtractor";

/**
 * Hook for extracting entities from text using OpenAI API
 * Provides error handling and loading states
 */
export const useOpenAIExtractor = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Extract entities from text content
   * @param content The text to analyze
   * @param options Optional configuration options
   * @returns Promise resolving to extracted entities
   */
  const extractEntities = useCallback(async (
    content: string,
    model?: 'gpt-3.5-turbo'
  ): Promise<ExtractedEntity[]> => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const entities = await extractEntitiesFromNote(content, model);
      return entities;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract entities';
      setError(errorMessage);
      console.error('Entity extraction error:', err);
      return [];
    } finally {
      setIsExtracting(false);
    }
  }, []);
  
  return {
    extractEntities,
    isExtracting,
    error,
    resetError: () => setError(null)
  };
};
