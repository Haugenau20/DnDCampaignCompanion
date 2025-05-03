// src/hooks/useEntityExtractor.ts
import { useCallback } from "react";
import { ExtractedEntity, EntityType } from "../types/note";
import { useNotes } from "../context/NoteContext";
import { useOpenAIExtractor } from "./useOpenAIExtractor";

/**
 * Hook for extracting and managing entities in notes
 * Combines OpenAI extraction with note context updates
 */
export const useEntityExtractor = () => {
  const { getNoteById, extractEntities } = useNotes();
  const { extractEntities: openAIExtract, isExtracting } = useOpenAIExtractor();
  
  /**
   * Extract entities from a note using OpenAI
   * @param noteId ID of the note to analyze
   * @param options Optional configuration options
   * @returns Promise resolving to extracted entities
   */
  const extractWithOpenAI = useCallback(async (
    noteId: string,
    options?: {
      model?: 'gpt-3.5-turbo' | 'gpt-4o';
    }
  ): Promise<ExtractedEntity[]> => {
    const note = getNoteById(noteId);
    if (!note) throw new Error('Note not found');
    
    // Use OpenAI to extract entities
    const entities = await openAIExtract(note.content, options);
    
    // Update note with extracted entities
    await extractEntities(noteId);
    
    return entities;
  }, [getNoteById, openAIExtract, extractEntities]);
  
  return {
    extractWithOpenAI,
    isExtracting
  };
};
