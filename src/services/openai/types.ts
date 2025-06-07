// src/services/openai/types.ts

/**
 * Response for extracted NPC entity
 */
export interface ExtractedNPCDetails {
    name: string;
    title?: string;
    race?: string;
    occupation?: string;
    location?: string;
    relationship: 'friendly' | 'neutral' | 'hostile' | 'unknown';
    description?: string;
    context: string;
  }
  
  /**
   * Response for extracted Location entity
   */
  export interface ExtractedLocationDetails {
    name: string;
    locationType: 'region' | 'city' | 'town' | 'village' | 'dungeon' | 'landmark' | 'building' | 'poi';
    description?: string;
    parentLocation?: string;
    context: string;
  }
  
  /**
   * Response for extracted Quest entity
   */
  export interface ExtractedQuestDetails {
    title: string;
    description?: string;
    objectives?: string[];
    NPCsInvolved?: string[];
    locationName?: string;
    context: string;
  }
  
  /**
   * Response for extracted Rumor entity
   */
  export interface ExtractedRumorDetails {
    title: string;
    content: string;
    status?: 'confirmed' | 'unconfirmed' | 'false';
    sourceType?: 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';
    sourceName?: string;
    context: string;
  }
  
  /**
   * Union type for all extracted entity details
   */
  export type ExtractedEntityDetails = 
    | ExtractedNPCDetails 
    | ExtractedLocationDetails 
    | ExtractedQuestDetails 
    | ExtractedRumorDetails;
  
  /**
   * OpenAI API response for entity extraction
   */
  export interface OpenAIEntityResponse {
    /** The extracted text for the entity */
    text: string;
    /** Type of the entity */
    type: 'npc' | 'location' | 'quest' | 'rumor';
    /** Confidence score from 0 to 1 */
    confidence: number;
    /** Extracted details based on entity type */
    details: ExtractedEntityDetails;
  }
  
  /**
   * Complete OpenAI API response
   */
  export interface OpenAIResponse {
    entities: OpenAIEntityResponse[];
  }