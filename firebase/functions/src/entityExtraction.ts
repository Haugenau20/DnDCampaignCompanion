// functions/src/entityExtraction.ts
import * as functions from "firebase-functions/v2/https";
import OpenAI from "openai";
import cors from "cors";

const corsHandler = cors({ origin: true });

// Types matching your existing OpenAI types
interface ExtractEntitiesRequest {
  content: string;
  model?: string;
}

export const extractEntities = functions.onRequest(
  {
    region: "europe-west1",
    secrets: ["OPENAI_API_KEY"], // Secret for API key
  },
  (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        // Check authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        // Validate request
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { content, model = "gpt-3.5-turbo" } = req.body as ExtractEntitiesRequest;

        if (!content || typeof content !== "string") {
          return res.status(400).json({ error: "Content is required" });
        }

        if (content.length > 10000) {
          return res.status(400).json({ error: "Content too long (max 10000 characters)" });
        }

        // Initialize OpenAI client with secret
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.error("OpenAI API key not configured");
          return res.status(500).json({ error: "Service not configured" });
        }

        const openai = new OpenAI({
          apiKey: openaiApiKey,
        });

        // Your existing system prompt and function definitions
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

Do not output any text yourself—*only* invoke the function with correct JSON.
`;

        // Copy your functions array from openaiFunctions.ts here
        const functions = [
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

        // Make OpenAI API call
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ],
          functions,
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

        // Parse and return the entities
        const parsedResponse = JSON.parse(rawArgs);
        
        return res.status(200).json({
          success: true,
          entities: parsedResponse.entities
        });

      } catch (error) {
        console.error("Entity extraction error:", error);
        return res.status(500).json({
          error: "Failed to extract entities",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });
  }
);