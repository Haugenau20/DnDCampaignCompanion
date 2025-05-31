// src/hooks/useEntityExtractor.ts
import { useCallback } from 'react';
import { ExtractedEntity, EntityType } from '../types/note';
import EntityExtractionService from '../services/firebase/ai/EntityExtractionService';
import { useNotes } from '../context/NoteContext';

/**
 * Hook for extracting entities from notes using Firebase Cloud Functions
 * Maintains the same interface but now uses secure server-side processing
 */
export const useEntityExtractor = () => {
  const { getNoteById } = useNotes();
  const entityService = EntityExtractionService.getInstance();

  /**
   * Deduplicate entities based on text and type, keeping highest confidence
   */
  const deduplicateEntities = (entities: ExtractedEntity[]): ExtractedEntity[] => {
    const uniqueMap = new Map<string, ExtractedEntity>();
    
    entities.forEach(entity => {
      const normalizedText = entity.text.toLowerCase().trim();
      const key = `${entity.type}-${normalizedText}`;
      
      if (!uniqueMap.has(key) || entity.confidence > uniqueMap.get(key)!.confidence) {
        uniqueMap.set(key, {
          ...entity,
          text: entity.text.trim() // Ensure consistent spacing
        });
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  /**
   * Extract entities from a note with deduplication
   */
  const extractWithOpenAI = useCallback(async (noteId: string): Promise<ExtractedEntity[]> => {
    const note = getNoteById(noteId);
    if (!note) {
      throw new Error('Note not found');
    }

    // Extract entities using the secure Cloud Function
    const rawEntities = await entityService.extractEntities(note.content);
    
    // Deduplicate based on type and normalized text
    const uniqueEntities = deduplicateEntities(rawEntities);
    
    return uniqueEntities;
  }, [getNoteById, entityService]);

  /**
   * Generate unique entity IDs to avoid conflicts
   */
  const generateEntityId = useCallback((text: string, type: EntityType): string => {
    const randomPart = Math.random().toString(36).substr(2, 9);
    const timeStamp = Date.now().toString(36);
    const sanitizedText = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${type}-${sanitizedText}-${timeStamp}-${randomPart}`;
  }, []);

  /**
   * Format raw OpenAI response into ExtractedEntity format
   */
  const formatEntity = useCallback((raw: any, type: EntityType): ExtractedEntity => {
    const id = generateEntityId(raw.text || '', type);
    const now = new Date().toISOString();
    
    return {
      id,
      text: raw.text?.trim() || '',
      type,
      confidence: raw.confidence || 0.8,
      isConverted: false,
      createdAt: now
    };
  }, [generateEntityId]);

  return {
    extractWithOpenAI,
    deduplicateEntities,
    formatEntity
  };
};