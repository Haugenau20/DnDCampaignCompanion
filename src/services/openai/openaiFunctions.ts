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

  export { functions };