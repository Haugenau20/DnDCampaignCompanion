# Phase 7: Entity Extraction Integration (Updated for OpenAI)


# Phase 7: Entity Extraction Integration (Updated for OpenAI)

## OpenAI Entity Extraction System

The entity extraction system uses OpenAI API to identify D&D campaign entities in session notes with high accuracy.

## Implementation Steps

### 1. Create OpenAI Integration Service
Path: `src/services/openai/entityExtractor.ts`

```typescript
// src/services/openai/entityExtractor.ts
import { ExtractedEntity, EntityType } from '../../types/note';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIResponse {
  entities: Array<{
    text: string;
    type: EntityType;
    confidence: number;
    context?: string;
  }>;
}

export const extractEntitiesFromNote = async (
  content: string,
  options?: {
    model?: 'gpt-3.5-turbo' | 'gpt-4o';
    temperature?: number;
  }
): Promise<ExtractedEntity[]> => {
  const model = options?.model || 'gpt-3.5-turbo';
  const temperature = options?.temperature || 0.3;
  
  const prompt = `
Extract D&D campaign entities from this session note. 
Find:
- NPCs (with titles, roles, etc.)
- Locations (cities, dungeons, forests, etc.)
- Items (magical artifacts, equipment, etc.)
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
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts D&D campaign entities from session notes. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsedResponse: OpenAIResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response from OpenAI');
    }

    // Convert to ExtractedEntity format
    const entities: ExtractedEntity[] = parsedResponse.entities.map(entity => ({
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

const generateEntityId = (): string => {
  return `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate token count (approximate)
export const estimateTokenCount = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Calculate cost
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
```

### 2. Update Context Environment File
Path: `src/context/firebase/FirebaseContext.tsx`

```typescript
// Add OpenAI error handling and usage tracking to Firebase context
export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... existing code ...
  
  const [openAIUsage, setOpenAIUsage] = useState({
    tokensUsed: 0,
    estimatedCost: 0,
    requestsCount: 0
  });
  
  const updateOpenAIUsage = useCallback((tokens: number, cost: number) => {
    setOpenAIUsage(prev => ({
      tokensUsed: prev.tokensUsed + tokens,
      estimatedCost: prev.estimatedCost + cost,
      requestsCount: prev.requestsCount + 1
    }));
  }, []);
  
  // Add to context value
  const value = {
    // ... existing values ...
    openAIUsage,
    updateOpenAIUsage
  };
  
  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};
```

### 3. Create API Key Configuration File
Path: `src/config/openai.ts`

```typescript
// src/config/openai.ts
export const OPENAI_CONFIG = {
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
  defaultModel: process.env.REACT_APP_OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.3,
  timeout: 30000, // 30 seconds
  maxRetries: 3
};

// Validate API key on app startup
export const validateOpenAIConfig = (): boolean => {
  if (!OPENAI_CONFIG.apiKey) {
    console.error('OpenAI API key is not configured. Please set REACT_APP_OPENAI_API_KEY in your environment.');
    return false;
  }
  return true;
};
```

### 4. Update Environment Variables
Add to `.env.development` and `.env.production`:

```env
# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_OPENAI_MODEL=gpt-3.5-turbo
```

### 5. Update NoteContext with OpenAI Integration
Modify `src/context/NoteContext.tsx`:

```typescript
// In convertEntity method, add:
import { extractEntitiesFromNote } from '../services/openai/entityExtractor';
import { linkNoteToEntity } from '../utils/note-relationships';

const extractEntities = useCallback(async (noteId: string): Promise<ExtractedEntity[]> => {
  const note = getNoteById(noteId);
  if (!note) throw new Error('Note not found');
  
  try {
    // Use OpenAI to extract entities
    const entities = await extractEntitiesFromNote(note.content);
    
    // Update note with extracted entities
    await updateData(noteId, {
      ...note,
      extractedEntities: entities
    });
    
    return entities;
  } catch (error) {
    console.error('OpenAI extraction failed:', error);
    throw error;
  }
}, [getNoteById, updateData]);
```

### 6. Enhanced Entity Card with OpenAI Confidence
Update `src/components/features/notes/EntityCard.tsx`:

```typescript
// Add OpenAI-specific confidence display
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return 'status-success';
  if (confidence >= 0.7) return 'primary';
  if (confidence >= 0.5) return 'warning';
  return 'status-failed';
};

// In render:
<Typography variant="body-sm" color="secondary">
  Type: {entity.type} • 
  <span className={getConfidenceColor(entity.confidence)}>
    AI Confidence: {(entity.confidence * 100).toFixed(0)}%
  </span>
</Typography>
```

### 7. Create OpenAI Usage Monitor Component
Path: `src/components/features/notes/OpenAIUsageMonitor.tsx`

```typescript
// src/components/features/notes/OpenAIUsageMonitor.tsx
import React from 'react';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import { useFirebaseContext } from '../../../context/firebase/FirebaseContext';
import { DollarSign, Clock, Cpu } from 'lucide-react';

const OpenAIUsageMonitor: React.FC = () => {
  const { openAIUsage } = useFirebaseContext();

  return (
    <Card>
      <Card.Content>
        <Typography variant="h4" className="mb-4">
          AI Usage Stats
        </Typography>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Tokens Used
              </Typography>
              <Typography variant="body">
                {openAIUsage.tokensUsed.toLocaleString()}
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Estimated Cost
              </Typography>
              <Typography variant="body">
                ${openAIUsage.estimatedCost.toFixed(4)}
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Requests Made
              </Typography>
              <Typography variant="body">
                {openAIUsage.requestsCount}
              </Typography>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default OpenAIUsageMonitor;
```

### Next Steps
Proceed to Phase 8: Campaign Integration