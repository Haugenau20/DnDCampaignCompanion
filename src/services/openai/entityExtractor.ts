// src/services/openai/entityExtractor.ts
import OpenAI from 'openai';
import { OPENAI_CONFIG } from '../../config/openai';
import { ExtractedEntity, EntityType } from '../../types/note';
import { functions } from './openaiFunctions';
import { 
  OpenAIResponse, 
  OpenAIEntityResponse, 
  ExtractedEntityDetails,
  ExtractedNPCDetails,
  ExtractedLocationDetails,
  ExtractedQuestDetails,
  ExtractedRumorDetails,
} from './types';

/**
 * Extract entities from note content using OpenAI
 * @param content The note content to extract entities from
 * @returns Array of extracted entities
 */
export const extractEntitiesFromNote = async (
  content: string,
  model: string = OPENAI_CONFIG.defaultModel
): Promise<ExtractedEntity[]> => {

  try {
    const client = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const systemPrompt = `
You are a Dungeons & Dragons session‐note parser.
Your *only* job is to call the function "extract_entities" with valid arguments.

The function schema strictly defines the allowed 'type' field as one of:
  - "npc"
  - "location"
  - "quest"
  - "rumor"

**Never** use any other value (e.g. "character", "person", etc.).  
Every named person or character is ALWAYS type "npc".

Do not output any text yourself—*only* invoke the function with correct JSON.*
`;

  const response = await client.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: content }
    ],
    functions,
    function_call: { name: "extract_entities" },
    temperature: 0
  });
  
  const choice = response.choices?.[0];
  if (!choice) {
    throw new Error("No choice returned from OpenAI");
  }
  
  // Pull the message object
  const msg = choice.message;
  
  //  Make sure the model actually invoked our function
  if (msg.function_call?.name !== "extract_entities") {
    throw new Error(
      `Expected function_call.extract_entities but got ${msg.function_call?.name}`
    );
  }
  
  //  Grab the raw JSON arguments
  const rawArgs = msg.function_call.arguments;
  if (!rawArgs) {
    throw new Error("Function call had no arguments");
  }
  
  //  Parse into your interface
  let openaiResponse: OpenAIResponse;
  try {
    openaiResponse = JSON.parse(rawArgs);
  } catch (err) {
    console.error("Failed to JSON.parse function_call.arguments:", rawArgs);
    throw new Error("Failed to parse OpenAI function arguments");
  }
  
  //  Map to your app’s entities
  return openaiResponse.entities.map(mapOpenAIEntityToExtractedEntity);
  } catch (error) {
    console.error('Error extracting entities:', error);
    throw error;
  }
};

/**
 * Map OpenAI entity response to ExtractedEntity format
 * @param openaiEntity OpenAI entity response
 * @returns ExtractedEntity with proper formatting including extraData
 */
const mapOpenAIEntityToExtractedEntity = (openaiEntity: OpenAIEntityResponse): ExtractedEntity => {
  const baseEntity: ExtractedEntity = {
    id: `${openaiEntity.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: openaiEntity.text,
    type: openaiEntity.type as EntityType,
    confidence: openaiEntity.confidence,
    isConverted: false,
    createdAt: new Date().toISOString(),
    extraData: {} // Initialize extraData
  };

  // Handle both formats: check if details exist, otherwise use root properties
  let details: any;
  if ('details' in openaiEntity && openaiEntity.details) {
    details = extractDetailsByType(openaiEntity.details, openaiEntity.type);
  } else {
    // If no details property, use the OpenAI entity object itself as details
    const { text, type, confidence, ...extraFields } = openaiEntity as any;
    details = extraFields;
  }
  
  // Store all detailed information in extraData
  baseEntity.extraData = {
    ...details,
    // Also store the original text for reference
    originalText: openaiEntity.text
  };

  return baseEntity;
};

/**
 * Extract specific details from OpenAI response based on entity type
 * @param details Entity details from OpenAI
 * @param type Entity type
 * @returns Formatted details object
 */
export const extractDetailsByType = (
  details: ExtractedEntityDetails,
  type: EntityType
): ExtractedEntityDetails => {
  switch (type) {
    case 'npc':
      const npcDetails = details as ExtractedNPCDetails;
      return {
        name: npcDetails.name,
        title: npcDetails.title,
        race: npcDetails.race,
        occupation: npcDetails.occupation,
        location: npcDetails.location,
        relationship: npcDetails.relationship || 'unknown',
        description: npcDetails.description,
        context: npcDetails.context,
      };

    case 'location':
      const locationDetails = details as ExtractedLocationDetails;
      return {
        name: locationDetails.name,
        locationType: locationDetails.locationType,
        description: locationDetails.description,
        parentLocation: locationDetails.parentLocation,
        context: locationDetails.context,
      };

    case 'quest':
      const questDetails = details as ExtractedQuestDetails;
      return {
        title: questDetails.title,
        description: questDetails.description,
        objectives: questDetails.objectives || [],
        NPCsInvolved: questDetails.NPCsInvolved || [],
        locationName: questDetails.locationName,
        context: questDetails.context,
      };

    case 'rumor':
      const rumorDetails = details as ExtractedRumorDetails;
      return {
        title: rumorDetails.title,
        content: rumorDetails.content,
        status: rumorDetails.status,
        sourceType: rumorDetails.sourceType,
        sourceName: rumorDetails.sourceName,
        context: rumorDetails.context,
      };

    default:
      return details;
  }
};