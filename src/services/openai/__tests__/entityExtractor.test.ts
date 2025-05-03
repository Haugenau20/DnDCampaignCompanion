// src/services/openai/__tests__/entityExtractor.test.ts
import { extractEntitiesFromNote, estimateTokenCount, calculateCost } from '../entityExtractor';
import { OPENAI_CONFIG } from '../../../config/openai';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenAI Entity Extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts entities successfully', async () => {
    // Mock successful response
    const mockResponse = {
      entities: [
        { text: 'Lord Blackthorn', type: 'npc', confidence: 0.95 },
        { text: 'City of Waterdeep', type: 'location', confidence: 0.9 }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      })
    });

    const content = 'The party met Lord Blackthorn in the City of Waterdeep.';
    const entities = await extractEntitiesFromNote(content);

    // Check entities were extracted correctly
    expect(entities).toHaveLength(2);
    expect(entities[0].text).toBe('Lord Blackthorn');
    expect(entities[0].type).toBe('npc');
    expect(entities[1].text).toBe('City of Waterdeep');
    expect(entities[1].type).toBe('location');

    // Check fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
        })
      })
    );
  });

  it('handles API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    await expect(extractEntitiesFromNote('test content')).rejects.toThrow('OpenAI API error');
  });

  it('handles invalid JSON responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Not valid JSON' } }]
      })
    });

    await expect(extractEntitiesFromNote('test content')).rejects.toThrow('Invalid response from OpenAI');
  });

  it('estimates token count correctly', () => {
    expect(estimateTokenCount('This is a test.')).toBe(4); // 14 chars ÷ 4 = 4 tokens (rounded up)
    expect(estimateTokenCount('A')).toBe(1); // 1 char = 1 token (minimum)
    expect(estimateTokenCount('This is a longer test with more words to estimate tokens')).toBe(14);
  });

  it('calculates cost correctly', () => {
    // For GPT-3.5-turbo, input cost is $0.0005/1K tokens
    expect(calculateCost(1000, 'gpt-3.5-turbo')).toBeCloseTo(0.0005 + 0.000375); // Input + output
    
    // For GPT-4o, input cost is $0.01/1K tokens
    expect(calculateCost(1000, 'gpt-4o')).toBeCloseTo(0.01 + 0.0075); // Input + output
    
    // Uses default model price for unknown models
    expect(calculateCost(1000, 'unknown-model')).toBeCloseTo(0.0005 + 0.000375);
  });
});