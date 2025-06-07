// src/services/firebase/ai/EntityExtractionService.ts
import { httpsCallable } from 'firebase/functions';
import BaseFirebaseService from '../core/BaseFirebaseService';
import ServiceRegistry from '../core/ServiceRegistry';
import { ExtractedEntity, EntityType } from '../../../types/note';
import { UsageStatus, UsageLimitError } from '../../../types/usage';
import { OpenAIEntityResponse, ExtractedEntityDetails } from '../../openai/types';

interface ExtractEntitiesResponse {
  success: boolean;
  entities?: OpenAIEntityResponse[];
  usage?: UsageStatus;
  error?: string;
}

interface GetUsageStatusResponse {
  success: boolean;
  usage?: UsageStatus;
  error?: string;
}

/**
 * Custom error class for usage limit exceeded
 */
export class UsageLimitExceededError extends Error {
  public usage: UsageStatus;
  public contactInfo: {
    message: string;
    contactUrl: string;
    prefilledSubject: string;
  };

  constructor(errorData: UsageLimitError) {
    super(errorData.error);
    this.name = 'UsageLimitExceededError';
    this.usage = errorData.usage;
    this.contactInfo = errorData.contactInfo;
  }
}

/**
 * Service for handling entity extraction through Firebase Functions
 * Uses Firebase SDK httpsCallable for proper environment handling
 */
class EntityExtractionService extends BaseFirebaseService {
  private static instance: EntityExtractionService;
  private currentUsage: UsageStatus | null = null;

  private constructor() {
    super();
    
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
   * Get current usage status
   */
  public getCurrentUsage(): UsageStatus | null {
    return this.currentUsage;
  }

  /**
   * Extract entities from content using Firebase Functions
   * Firebase SDK automatically handles emulator vs production routing
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

      // Use Firebase SDK httpsCallable - automatically handles CORS and routing
      const extractEntitiesFunction = httpsCallable(this.functions, 'extractEntities');
      
      const result = await extractEntitiesFunction({
        content,
        model
      });

      const extractionResult = result.data as ExtractEntitiesResponse;

      // With onCall functions, errors are thrown as exceptions, so if we get here,
      // the call was successful. Just check that we have entities.
      if (!extractionResult.success || !extractionResult.entities) {
        throw new Error('No entities returned');
      }

      // Store current usage for UI display
      if (extractionResult.usage) {
        this.currentUsage = extractionResult.usage;
      }

      return extractionResult.entities.map(this.mapOpenAIEntityToExtractedEntity);
      
    } catch (error) {
      console.error('Entity extraction service error:', error);
      
      // Handle Firebase Functions errors (from HttpsError throws)
      if (error && typeof error === 'object' && 'code' in error && 'details' in error) {
        const firebaseError = error as any;
        
        // Check for usage limit exceeded error
        if (firebaseError.code === 'functions/resource-exhausted' && 
            firebaseError.message.includes('USAGE_LIMIT_EXCEEDED')) {
          
          // Extract usage data from error details if available
          const errorDetails = firebaseError.details;
          if (errorDetails && errorDetails.usage) {
            this.currentUsage = errorDetails.usage;
          }
          
          throw new UsageLimitExceededError({
            error: firebaseError.message,
            code: 'USAGE_LIMIT_EXCEEDED',
            usage: errorDetails?.usage,
            contactInfo: errorDetails?.contactInfo || {
              message: "You've reached your smart detection limit. Contact support for assistance.",
              contactUrl: "/contact",
              prefilledSubject: "Smart Detection Limit Increase Request"
            }
          });
        }
        
        // Handle other Firebase function errors
        throw new Error(firebaseError.message || 'Smart Detection failed');
      }
      
      // Handle other errors
      throw error;
    }
  }

  /**
   * Fetch current usage status without performing extraction
   * NO OpenAI API calls - only reads Firestore data
   * Useful for displaying usage info in the UI
   */
  public async fetchUsageStatus(): Promise<UsageStatus | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return null;
      }

      // Use the new getUsageStatus function - NO OpenAI calls, NO usage increments
      const getUsageStatusFunction = httpsCallable(this.functions, 'getUsageStatus');
      
      const result = await getUsageStatusFunction();
      const statusResult = result.data as GetUsageStatusResponse;

      // If successful, extract usage from response
      if (statusResult.success && statusResult.usage) {
        this.currentUsage = statusResult.usage;
        return statusResult.usage;
      }

      return null;
    } catch (error) {
      // Handle Firebase Functions errors to extract usage data even from limit exceeded errors
      if (error && typeof error === 'object' && 'code' in error && 'details' in error) {
        const firebaseError = error as any;
        
        // If it's a usage limit error, we can still extract the usage from it
        if (firebaseError.code === 'functions/resource-exhausted' && 
            firebaseError.details?.usage) {
          this.currentUsage = firebaseError.details.usage;
          return firebaseError.details.usage;
        }
      }
      
      console.error('Error fetching usage status:', error);
      return null;
    }
  }

  /**
   * Clear cached usage data (useful after manual limit increases)
   */
  public clearUsageCache(): void {
    this.currentUsage = null;
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