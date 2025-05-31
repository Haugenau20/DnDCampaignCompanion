// src/services/firebase/ai/EntityExtractionService.ts
import BaseFirebaseService from '../core/BaseFirebaseService';
import ServiceRegistry from '../core/ServiceRegistry';
import { ExtractedEntity, EntityType } from '../../../types/note';
import { OpenAIEntityResponse, ExtractedEntityDetails } from '../../openai/types';

interface ExtractEntitiesResponse {
  success: boolean;
  entities?: OpenAIEntityResponse[];
  error?: string;
}

/**
 * Service for handling entity extraction through Firebase Functions
 * Replaces direct OpenAI API calls with secure server-side processing
 */
class EntityExtractionService extends BaseFirebaseService {
  private static instance: EntityExtractionService;
  private readonly FUNCTION_URL: string;

  private constructor() {
    super();
    const projectId = 'dnd-campaign-companion';
    const region = 'europe-west1';
    const functionName = 'extractEntities';
    
    this.FUNCTION_URL = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    
    // Register with ServiceRegistry
    ServiceRegistry.getInstance().register('EntityExtractionService', this);
  }

  public static getInstance(): EntityExtractionService {
    if (!EntityExtractionService.instance) {
      EntityExtractionService.instance = new EntityExtractionService();
    }
    return EntityExtractionService.instance;
  }

  /**
   * Extract entities from content using the secure Cloud Function
   */
  public async extractEntities(
    content: string,
    model: string = 'gpt-3.5-turbo'
  ): Promise<ExtractedEntity[]> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken();

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          content,
          model
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Entity extraction failed');
      }

      const result: ExtractEntitiesResponse = await response.json();
      
      if (!result.success || !result.entities) {
        throw new Error(result.error || 'No entities returned');
      }

      return result.entities.map(this.mapOpenAIEntityToExtractedEntity);
      
    } catch (error) {
      console.error('Entity extraction service error:', error);
      throw error;
    }
  }

  /**
   * Map OpenAI entity response to ExtractedEntity format
   */
  private mapOpenAIEntityToExtractedEntity = (
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

    // Handle both formats
    let details: any;
    if ('details' in openaiEntity && openaiEntity.details) {
      details = this.extractDetailsByType(openaiEntity.details, openaiEntity.type);
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
  private extractDetailsByType = (
    details: ExtractedEntityDetails,
    type: EntityType
  ): any => {
    // Implementation from your original extractDetailsByType function
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
}

export default EntityExtractionService;