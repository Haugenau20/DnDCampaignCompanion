// src/services/firebase/ai/entityMapper.ts
import { ExtractedEntity, EntityType } from '../../../types/note';
import { OpenAIEntityResponse } from '../../openai/types';

/**
 * Map OpenAI entity response to ExtractedEntity format
 * Moved from entityExtractor.ts to work with Firebase Functions response
 */
export const mapOpenAIEntityToExtractedEntity = (
  openaiEntity: OpenAIEntityResponse
): ExtractedEntity => {
  const baseEntity: ExtractedEntity = {
    id: `${openaiEntity.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: openaiEntity.text,
    type: openaiEntity.type as EntityType,
    confidence: openaiEntity.confidence,
    isConverted: false,
    createdAt: new Date().toISOString(),
    extraData: {}
  };

  // Handle both formats: check if details exist, otherwise use root properties
  let details: any;
  if ('details' in openaiEntity && openaiEntity.details) {
    details = extractDetailsByType(openaiEntity.details, openaiEntity.type);
  } else {
    const { text, type, confidence, ...extraFields } = openaiEntity as any;
    details = extraFields;
  }
  
  baseEntity.extraData = {
    ...details,
    originalText: openaiEntity.text
  };

  return baseEntity;
};

// Copy the extractDetailsByType function from entityExtractor.ts here
export const extractDetailsByType = (
  details: any,
  type: EntityType
): any => {
  // ... (copy the full implementation)
};