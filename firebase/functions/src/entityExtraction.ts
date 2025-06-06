// functions/src/entityExtraction.ts
import * as functions from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import OpenAI from "openai";

// Types matching your existing OpenAI types
interface ExtractEntitiesRequest {
  content: string;
  model?: string;
}

// Usage tracking types
interface PeriodUsage {
  count: number;
  lastReset: string;
  limit: number;
}

interface EntityExtractionUsage {
  daily: PeriodUsage;
  weekly: PeriodUsage;
  monthly: PeriodUsage;
  customLimit?: number;
  isUnlimited?: boolean;
  lastExtraction?: string;
}

interface UsageStatus {
  usage: EntityExtractionUsage;
  limitExceeded: boolean;
  exceededPeriod?: 'daily' | 'weekly' | 'monthly';
  nextReset: {
    daily: string;
    weekly: string;
    monthly: string;
  };
}

// Default usage limits
const DEFAULT_USAGE_LIMITS = {
  daily: 10,
  weekly: 30,
  monthly: 100
};

/**
 * Calculate next reset time for a given period
 */
function getNextReset(period: 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  const resetTime = new Date(now);
  
  switch (period) {
    case 'daily':
      resetTime.setUTCHours(0, 0, 0, 0);
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      break;
    case 'weekly':
      // Reset on Monday at midnight UTC
      const daysUntilMonday = (8 - resetTime.getUTCDay()) % 7 || 7;
      resetTime.setUTCHours(0, 0, 0, 0);
      resetTime.setUTCDate(resetTime.getUTCDate() + daysUntilMonday);
      break;
    case 'monthly':
      resetTime.setUTCHours(0, 0, 0, 0);
      resetTime.setUTCDate(1);
      resetTime.setUTCMonth(resetTime.getUTCMonth() + 1);
      break;
  }
  
  return resetTime;
}

/**
 * Check if a period needs to be reset
 */
function shouldResetPeriod(lastReset: string, period: 'daily' | 'weekly' | 'monthly'): boolean {
  const lastResetDate = new Date(lastReset);
  const now = new Date();
  
  switch (period) {
    case 'daily':
      return lastResetDate.getUTCDate() !== now.getUTCDate() || 
             lastResetDate.getUTCMonth() !== now.getUTCMonth() ||
             lastResetDate.getUTCFullYear() !== now.getUTCFullYear();
    case 'weekly':
      const lastWeek = getWeekNumber(lastResetDate);
      const currentWeek = getWeekNumber(now);
      return lastWeek !== currentWeek;
    case 'monthly':
      return lastResetDate.getUTCMonth() !== now.getUTCMonth() ||
             lastResetDate.getUTCFullYear() !== now.getUTCFullYear();
    default:
      return false;
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Initialize default usage data
 */
function initializeUsageData(): EntityExtractionUsage {
  const now = new Date().toISOString();
  
  return {
    daily: {
      count: 0,
      lastReset: now,
      limit: DEFAULT_USAGE_LIMITS.daily
    },
    weekly: {
      count: 0,
      lastReset: now,
      limit: DEFAULT_USAGE_LIMITS.weekly
    },
    monthly: {
      count: 0,
      lastReset: now,
      limit: DEFAULT_USAGE_LIMITS.monthly
    }
  };
}

/**
 * Get usage status without incrementing counters
 * Used for display purposes only
 */
async function getUserUsageStatus(userId: string): Promise<UsageStatus> {
  const userRef = admin.firestore().collection("users").doc(userId);
  const userDoc = await userRef.get();
  
  let usageData: EntityExtractionUsage;
  
  if (!userDoc.exists || !userDoc.data()?.entityExtractionUsage) {
    // Initialize usage data for new user
    usageData = initializeUsageData();
  } else {
    usageData = userDoc.data()!.entityExtractionUsage as EntityExtractionUsage;
  }
  
  // Check if user has unlimited access
  if (usageData.isUnlimited) {
    return {
      usage: usageData,
      limitExceeded: false,
      nextReset: {
        daily: getNextReset('daily').toISOString(),
        weekly: getNextReset('weekly').toISOString(),
        monthly: getNextReset('monthly').toISOString()
      }
    };
  }
  
  const now = new Date().toISOString();
  let needsUpdate = false;
  
  // Reset periods if needed (but don't increment counters)
  if (shouldResetPeriod(usageData.daily.lastReset, 'daily')) {
    usageData.daily.count = 0;
    usageData.daily.lastReset = now;
    needsUpdate = true;
  }
  
  if (shouldResetPeriod(usageData.weekly.lastReset, 'weekly')) {
    usageData.weekly.count = 0;
    usageData.weekly.lastReset = now;
    needsUpdate = true;
  }
  
  if (shouldResetPeriod(usageData.monthly.lastReset, 'monthly')) {
    usageData.monthly.count = 0;
    usageData.monthly.lastReset = now;
    needsUpdate = true;
  }
  
  // Update database if periods were reset
  if (needsUpdate) {
    await userRef.set({ entityExtractionUsage: usageData }, { merge: true });
  }
  
  // Check limits without incrementing
  const dailyLimit = usageData.customLimit ?? usageData.daily.limit;
  const weeklyLimit = usageData.weekly.limit;
  const monthlyLimit = usageData.monthly.limit;
  
  let limitExceeded = false;
  let exceededPeriod: 'daily' | 'weekly' | 'monthly' | undefined;
  
  if (usageData.daily.count >= dailyLimit) {
    limitExceeded = true;
    exceededPeriod = 'daily';
  } else if (usageData.weekly.count >= weeklyLimit) {
    limitExceeded = true;
    exceededPeriod = 'weekly';
  } else if (usageData.monthly.count >= monthlyLimit) {
    limitExceeded = true;
    exceededPeriod = 'monthly';
  }
  
  return {
    usage: usageData,
    limitExceeded,
    exceededPeriod,
    nextReset: {
      daily: getNextReset('daily').toISOString(),
      weekly: getNextReset('weekly').toISOString(),
      monthly: getNextReset('monthly').toISOString()
    }
  };
}

/**
 * Check and update usage limits - increments counters
 * Used only when actually performing extraction
 */
async function checkAndUpdateUsage(userId: string): Promise<UsageStatus> {
  const userRef = admin.firestore().collection("users").doc(userId);
  const userDoc = await userRef.get();
  
  let usageData: EntityExtractionUsage;
  
  if (!userDoc.exists || !userDoc.data()?.entityExtractionUsage) {
    // Initialize usage data for new user
    usageData = initializeUsageData();
  } else {
    usageData = userDoc.data()!.entityExtractionUsage as EntityExtractionUsage;
  }
  
  // Check if user has unlimited access
  if (usageData.isUnlimited) {
    return {
      usage: usageData,
      limitExceeded: false,
      nextReset: {
        daily: getNextReset('daily').toISOString(),
        weekly: getNextReset('weekly').toISOString(),
        monthly: getNextReset('monthly').toISOString()
      }
    };
  }
  
  const now = new Date().toISOString();
  let needsUpdate = false;
  
  // Reset periods if needed
  if (shouldResetPeriod(usageData.daily.lastReset, 'daily')) {
    usageData.daily.count = 0;
    usageData.daily.lastReset = now;
    needsUpdate = true;
  }
  
  if (shouldResetPeriod(usageData.weekly.lastReset, 'weekly')) {
    usageData.weekly.count = 0;
    usageData.weekly.lastReset = now;
    needsUpdate = true;
  }
  
  if (shouldResetPeriod(usageData.monthly.lastReset, 'monthly')) {
    usageData.monthly.count = 0;
    usageData.monthly.lastReset = now;
    needsUpdate = true;
  }
  
  // Check limits
  const dailyLimit = usageData.customLimit ?? usageData.daily.limit;
  const weeklyLimit = usageData.weekly.limit;
  const monthlyLimit = usageData.monthly.limit;
  
  let limitExceeded = false;
  let exceededPeriod: 'daily' | 'weekly' | 'monthly' | undefined;
  
  if (usageData.daily.count >= dailyLimit) {
    limitExceeded = true;
    exceededPeriod = 'daily';
  } else if (usageData.weekly.count >= weeklyLimit) {
    limitExceeded = true;
    exceededPeriod = 'weekly';
  } else if (usageData.monthly.count >= monthlyLimit) {
    limitExceeded = true;
    exceededPeriod = 'monthly';
  }
  
  // If not exceeded, increment counters (this is the key difference)
  if (!limitExceeded) {
    usageData.daily.count++;
    usageData.weekly.count++;
    usageData.monthly.count++;
    usageData.lastExtraction = now;
    needsUpdate = true;
  }
  
  // Update database if needed
  if (needsUpdate) {
    await userRef.set({ entityExtractionUsage: usageData }, { merge: true });
  }
  
  return {
    usage: usageData,
    limitExceeded,
    exceededPeriod,
    nextReset: {
      daily: getNextReset('daily').toISOString(),
      weekly: getNextReset('weekly').toISOString(),
      monthly: getNextReset('monthly').toISOString()
    }
  };
}

/**
 * Get usage status without any API calls or counter increments
 * Use this for UI display purposes only
 */
export const getUsageStatus = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Unauthorized");
      }

      const userId = request.auth.uid;

      // Get usage status without incrementing anything
      const usageStatus = await getUserUsageStatus(userId);
      
      return {
        success: true,
        usage: usageStatus
      };

    } catch (error) {
      console.error("Get usage status error:", error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to get usage status");
    }
  }
);

/**
 * Extract entities and increment usage when calling OpenAI
 */
export const extractEntities = functions.onCall(
  {
    region: "europe-west1",
    secrets: ["OPENAI_API_KEY"], // Secret for API key
  },
  async (request: functions.CallableRequest<ExtractEntitiesRequest>) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Unauthorized");
      }

      const userId = request.auth.uid;
      const { content, model = "gpt-3.5-turbo" } = request.data;

      // Validate input BEFORE checking usage
      if (!content || typeof content !== "string") {
        throw new HttpsError("invalid-argument", "Content is required");
      }

      if (content.length > 10000) {
        throw new HttpsError("invalid-argument", "Content too long (max 10000 characters)");
      }

      // Check usage limits and increment counters (only if we're going to call OpenAI)
      const usageStatus = await checkAndUpdateUsage(userId);
      
      if (usageStatus.limitExceeded) {
        throw new HttpsError("resource-exhausted", "USAGE_LIMIT_EXCEEDED", {
          usage: usageStatus,
          contactInfo: {
            message: "You've reached your smart detection limit. Contact us to request an increase.",
            contactUrl: "/contact",
            prefilledSubject: "Smart Detection Limit Increase Request"
          }
        });
      }

      // Initialize OpenAI client with secret
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error("OpenAI API key not configured");
        throw new HttpsError("internal", "Service not configured");
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      // Your existing system prompt and function definitions
      const systemPrompt = `
You are a Dungeons & Dragons session-note parser.
Your *only* job is to call the function "extract_entities" with valid arguments.

The function schema strictly defines the allowed 'type' field as one of:
  - "npc"
  - "location"
  - "quest"
  - "rumor"

**Never** use any other value (e.g. "character", "person", etc.).  
Every named person or character is ALWAYS type "npc".

Do not output any text yourself—*only* invoke the function with correct JSON.
`;

      // Copy your functions array from openaiFunctions.ts here
      const openAIFunctions = [
      {
          name: "extract_entities",
          description: "Extract D&D entities from a session note",
          parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
              entities: {
              type: "array",
              items: {
                  oneOf: [
                  {
                      // NPC schema
                      type: "object",
                      additionalProperties: false,
                      properties: {
                          type: { const: "npc" },
                          text: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                          name: { type: "string" },
                          title: { type: ["string", "null"] },
                          race: { type: ["string", "null"] },
                          occupation: { type: ["string", "null"] },
                          location: { type: ["string", "null"] },
                          relationship: {
                          type: "string",
                          enum: ["friendly", "neutral", "hostile", "unknown"]
                          },
                          description: { type: ["string", "null"] },
                          context: { type: "string" }
                      },
                      required: [
                          "type",
                          "text",
                          "confidence",
                          "name",
                          "context"
                      ]
                      },
                      {
                      // Location schema
                      type: "object",
                      additionalProperties: false,
                      properties: {
                          type: { const: "location" },
                          text: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                          name: { type: "string" },
                          locationType: {
                          type: "string",
                          enum: [
                              "region",
                              "city",
                              "town",
                              "village",
                              "dungeon",
                              "landmark",
                              "building",
                              "poi"
                          ]
                          },
                          description: { type: ["string", "null"] },
                          parentLocation: { type: ["string", "null"] },
                          context: { type: "string" }
                      },
                      required: [
                          "type",
                          "text",
                          "confidence",
                          "name",
                          "locationType",
                          "context"
                      ]
                      },
                      {
                      // Quest schema
                      type: "object",
                      additionalProperties: false,
                      properties: {
                          type: { const: "quest" },
                          text: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                          title: { type: "string" },
                          description: { type: ["string", "null"] },
                          objectives: {
                          type: "array",
                          items: { type: "string" }
                          },
                          relatedNPCIds: {
                          type: "array",
                          items: { type: "string" }
                          },
                          locationName: { type: ["string", "null"] }
                      },
                      required: [
                          "type",
                          "text",
                          "confidence",
                          "title",
                          "objectives",
                          "relatedNPCIds"
                      ]
                      },
                      {
                      // Rumor schema
                      type: "object",
                      additionalProperties: false,
                      properties: {
                          type: { const: "rumor" },
                          text: { type: "string" },
                          confidence: { type: "number", minimum: 0, maximum: 1 },
                          title: { type: "string" },
                          content: { type: "string" },
                          status: {
                          type: "string",
                          enum: ["confirmed", "unconfirmed", "false", "unknown"]
                          },
                          sourceType: {
                          type: "string",
                          enum: ["npc", "tavern", "notice", "traveler", "other"]
                          },
                          sourceName: { type: ["string", "null"] }
                      },
                      required: [
                          "type",
                          "text",
                          "confidence",
                          "title",
                          "content"
                      ]
                      }
                  ]
              }
              }
          },
          required: ["entities"]
          }
      }
      ];

      // Make OpenAI API call (this is where the cost occurs)
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ],
        functions: openAIFunctions,
        function_call: { name: "extract_entities" },
        temperature: 0
      });

      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error("No response from OpenAI");
      }

      const msg = choice.message;
      if (msg.function_call?.name !== "extract_entities") {
        throw new Error("Unexpected function call");
      }

      const rawArgs = msg.function_call.arguments;
      if (!rawArgs) {
        throw new Error("No arguments in function call");
      }

      // Parse and return the entities with usage info
      const parsedResponse = JSON.parse(rawArgs);
      
      return {
        success: true,
        entities: parsedResponse.entities,
        usage: usageStatus
      };

    } catch (error) {
      console.error("Entity extraction error:", error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to extract entities");
    }
  }
);