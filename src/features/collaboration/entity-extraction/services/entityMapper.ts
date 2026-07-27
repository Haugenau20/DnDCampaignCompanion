// src/features/collaboration/entity-extraction/services/entityMapper.ts
import { ExtractedEntity, EntityType } from '../../notes/types';
import { OpenAIEntityResponse, ExtractedEntityDetails } from 'core/services/openai/types';

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

/**
 * Extract specific details from OpenAI response based on entity type
 */
export const extractDetailsByType = (
  details: ExtractedEntityDetails,
  type: EntityType
): any => {
  switch (type) {
    case 'npc':
      return {
        name: (details as any).name,
        title: (details as any).title,
        race: (details as any).race,
        occupation: (details as any).occupation,
        location: (details as any).location,
        relationship: (details as any).relationship || 'unknown',
        description: (details as any).description,
        context: (details as any).context,
      };
    case 'location':
      return {
        name: (details as any).name,
        locationType: (details as any).locationType,
        description: (details as any).description,
        parentLocation: (details as any).parentLocation,
        context: (details as any).context,
      };
    case 'quest':
      return {
        title: (details as any).title,
        description: (details as any).description,
        objectives: (details as any).objectives || [],
        NPCsInvolved: (details as any).NPCsInvolved || [],
        locationName: (details as any).locationName,
        context: (details as any).context,
      };
    case 'rumor':
      return {
        title: (details as any).title,
        content: (details as any).content,
        status: (details as any).status,
        sourceType: (details as any).sourceType,
        sourceName: (details as any).sourceName,
        context: (details as any).context,
      };
    default:
      return details;
  }
};