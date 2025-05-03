// src/components/features/notes/EntityExtractor.tsx
import React, { useState, useEffect } from "react";
import { ExtractedEntity } from "../../../types/note";
import Typography from "../../core/Typography";
import Button from "../../core/Button";
import Card from "../../core/Card";
import EntityCard from "./EntityCard";
import { useEntityExtractor } from "../../../hooks/useEntityExtractor";
import { useNotes } from "../../../context/NoteContext";

interface EntityExtractorProps {
  /** ID of the note to extract entities from */
  noteId: string;
  /** Callback when an entity is converted */
  onEntityConverted?: (entityId: string, createdId: string) => void;
}

/**
 * Component for extracting and displaying entities from notes
 * Integrates with OpenAI for entity extraction
 */
const EntityExtractor: React.FC<EntityExtractorProps> = ({ 
  noteId, 
  onEntityConverted 
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { extractWithOpenAI } = useEntityExtractor();
  const { getNoteById } = useNotes();
  
  // Load existing entities from the note
  useEffect(() => {
    const note = getNoteById(noteId);
    if (note && note.extractedEntities.length > 0) {
      setExtractedEntities(note.extractedEntities);
    }
  }, [noteId, getNoteById]);
  
  /**
   * Perform entity extraction on the note
   */
  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    
    try {
      // Get the note first to verify it exists
      const note = getNoteById(noteId);
      if (!note) {
        throw new Error("Note not found");
      }
      
      // Don't extract if content is too short
      if (note.content.length < 50) {
        throw new Error("Note content is too short for extraction");
      }
      
      // Extract entities using OpenAI
      const entities = await extractWithOpenAI(noteId);
      setExtractedEntities(prev => [...prev, ...entities]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to extract entities";
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };
  
  /**
   * Handle entity conversion
   */
  const handleEntityConverted = (entityId: string, createdId: string) => {
    // Update local state
    setExtractedEntities(prevEntities =>
      prevEntities.map(entity => 
        entity.id === entityId
          ? { ...entity, isConverted: true, convertedToId: createdId }
          : entity
      )
    );
    
    // Call parent callback if provided
    if (onEntityConverted) {
      onEntityConverted(entityId, createdId);
    }
  };

  return (
    <Card className="entity-extractor">
      <Card.Content>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Typography variant="h4">Entity Extraction</Typography>
            <Button
              onClick={handleExtract}
              disabled={isExtracting}
              className="extract-button"
            >
              {isExtracting ? "Extracting..." : "Extract Entities"}
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded error-container">
              <div className="w-4 h-4 icon-error" />
              <Typography variant="body-sm" color="error">
                {error}
              </Typography>
            </div>
          )}

          {/* Loading state */}
          {isExtracting && (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 icon-loading" />
              <Typography color="secondary">
                Analyzing note content...
              </Typography>
            </div>
          )}

          {/* Extracted entities */}
          {!isExtracting && extractedEntities.length > 0 && (
            <div className="space-y-3">
              <Typography variant="h4">Extracted Entities</Typography>
              <div className="grid gap-3">
                {extractedEntities.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    noteId={noteId}
                    onConverted={handleEntityConverted}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {!isExtracting && extractedEntities.length === 0 && !error && (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 icon-info" />
              <Typography color="secondary">
                Click "Extract Entities" to analyze your note and identify NPCs, locations, quests, and more.
              </Typography>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityExtractor;