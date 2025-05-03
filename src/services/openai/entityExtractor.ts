// src/services/openai/entityExtractor.ts
import { ExtractedEntity, EntityType } from '../../types/note';
import { OPENAI_CONFIG } from '../../config/openai';
import OpenAI from 'openai';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Response format from OpenAI extraction
 */
type OpenAIResponse = Array<{
  text: string;
  type: EntityType;
  confidence: number;
  context?: string;
}>;

/**
 * Extracts entities from note content using OpenAI API
 * @param content The note text content to analyze
 * @param options Optional configuration options
 * @returns Promise resolving to array of extracted entities
 */
export const extractEntitiesFromNote = async (
  content: string,
  options?: {
    model?: 'gpt-3.5-turbo' | 'gpt-4o';
    temperature?: number;
  }
): Promise<ExtractedEntity[]> => {
  const model = options?.model || OPENAI_CONFIG.defaultModel;
  const temperature = options?.temperature || OPENAI_CONFIG.temperature;
  
  const prompt = `
Extract D&D campaign entities from this session note. 
Find:
- NPCs (with titles, roles, etc.)
- Locations (cities, dungeons, forests, etc.)
- Quests (missions, objectives, etc.)
- Rumors (unconfirmed information, gossip, etc.)

For each entity, provide:
- text: The entity name as it appears
- type: npc/location/item/quest/rumor
- confidence: 0-1 based on how certain you are
- context: Brief context of where it appears

Session note:
${content}

Return as JSON array:
`;

  try {

    const client = new OpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const response = await client.responses.create({
      model: model,
      instructions: 'You are a helpful assistant that extracts D&D campaign entities from session notes. Return only valid JSON.',
      input: prompt,
    });

    const content = response.output_text;
    
    // Parse JSON response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

    if (!jsonMatch) {
      console.error('Raw response:', content);
      throw new Error('No valid JSON found in OpenAI response');
    }

    const jsonString = jsonMatch[1].trim();

    let parsedResponse: OpenAIResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse extracted JSON:', jsonString);
      throw new Error('Invalid JSON in OpenAI response');
    }

    const entities: ExtractedEntity[] = parsedResponse.map(entity => ({
      id: generateEntityId(),
      text: entity.text,
      type: entity.type,
      confidence: entity.confidence,
      isConverted: false,
      createdAt: new Date().toISOString()
    }));

    return entities;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw error;
  }
};

/**
 * Generates a unique ID for an extracted entity
 * @returns A unique ID string
 */
const generateEntityId = (): string => {
  return `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Estimates token count in a text for OpenAI API pricing
 * @param text The text to estimate tokens for
 * @returns Approximate token count
 */
export const estimateTokenCount = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

/**
 * Calculates approximate cost of an OpenAI API request
 * @param tokenCount The number of tokens in the request
 * @param model The OpenAI model being used
 * @returns Approximate cost in USD
 */
export const calculateCost = (tokenCount: number, model: string): number => {
  const pricing = {
    'gpt-3.5-turbo': {
      input: 0.0005,  // $0.0005 per 1K tokens
      output: 0.0015  // $0.0015 per 1K tokens
    },
    'gpt-4o': {
      input: 0.01,    // $0.01 per 1K tokens
      output: 0.03    // $0.03 per 1K tokens
    }
  };

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-3.5-turbo'];
  
  // Estimate total cost (input + output)
  const inputCost = (tokenCount / 1000) * modelPricing.input;
  const outputCost = (tokenCount / 4) / 1000 * modelPricing.output; // Output is roughly 1/4 of input
  
  return inputCost + outputCost;
};
