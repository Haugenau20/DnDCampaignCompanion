// src/config/openai.ts

/**
 * OpenAI API configuration for entity extraction
 */
export const OPENAI_CONFIG = {
  /** API key from environment variable */
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
  /** Default model to use */
  defaultModel: process.env.REACT_APP_OPENAI_MODEL || 'gpt-3.5-turbo',
  /** Maximum tokens to generate in responses */
  maxTokens: 1024,
  /** Temperature for generation (0-1, lower is more deterministic) */
  temperature: 0.3,
  /** Request timeout in milliseconds */
  timeout: 30000, // 30 seconds
  /** Maximum number of retries on failure */
  maxRetries: 3
};

/**
 * Validates that the OpenAI API key is configured
 * @returns boolean indicating whether the API key is present
 */
export const validateOpenAIConfig = (): boolean => {
  if (!OPENAI_CONFIG.apiKey) {
    console.error('OpenAI API key is not configured. Please set REACT_APP_OPENAI_API_KEY in your environment.');
    return false;
  }
  return true;
};
