// src/components/features/notes/EntityCard.tsx
import React, { useState } from "react";
import { ExtractedEntity, EntityType } from "../../../types/note";
import Typography from "../../core/Typography";
import Button from "../../core/Button";
import Card from "../../core/Card";
import { useNotes } from "../../../context/NoteContext";

interface EntityCardProps {
  /** The extracted entity to display */
  entity: ExtractedEntity;
  /** ID of the note this entity belongs to */
  noteId: string;
  /** Callback when entity is converted to a campaign element */
  onConverted?: (entityId: string, createdId: string) => void;
}

/**
 * Card component for displaying an extracted entity
 * Includes controls for converting to campaign elements
 */
const EntityCard: React.FC<EntityCardProps> = ({ 
  entity, 
  noteId, 
  onConverted 
}) => {
  const { convertEntity } = useNotes();
  const [isConverting, setIsConverting] = useState(false);
  
  /**
   * Get the appropriate icon class for each entity type
   */
  const getEntityIconClass = (type: EntityType): string => {
    switch (type) {
      case "npc":
        return "icon-npc";
      case "location":
        return "icon-location";
      case "quest":
        return "icon-quest";
      case "item":
        return "icon-item";
      case "rumor":
        return "icon-rumor";
      default:
        return "icon-default";
    }
  };
  
  /**
   * Get the display name for each entity type
   */
  const getEntityTypeName = (type: EntityType): string => {
    switch (type) {
      case "npc":
        return "NPC";
      case "location":
        return "Location";
      case "quest":
        return "Quest";
      case "item":
        return "Item";
      case "rumor":
        return "Rumor";
      default:
        return type;
    }
  };
  
  /**
   * Get a color class based on confidence level
   */
  const getConfidenceColorClass = (confidence: number): string => {
    if (confidence >= 0.9) return "confidence-high";
    if (confidence >= 0.7) return "confidence-medium";
    if (confidence >= 0.5) return "confidence-low";
    return "confidence-very-low";
  };

  /**
   * Handle converting entity to a campaign element
   */
  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const createdId = await convertEntity(noteId, entity.id, entity.type);
      if (onConverted) {
        onConverted(entity.id, createdId);
      }
    } catch (error) {
      console.error("Failed to convert entity:", error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card 
      className={`entity-card ${entity.isConverted ? "entity-converted" : ""}`}
    >
      <Card.Content className="p-4">
        <div className="flex items-center gap-4">
          <div className={`w-5 h-5 ${getEntityIconClass(entity.type)}`} />
          
          <div className="flex-1">
            <Typography variant="body" className="font-medium">
              {entity.text}
            </Typography>
            
            <Typography variant="body-sm" color="secondary">
              {getEntityTypeName(entity.type)} • 
              <span className={getConfidenceColorClass(entity.confidence)}>
                Confidence: {(entity.confidence * 100).toFixed(0)}%
              </span>
            </Typography>
          </div>
          
          {entity.isConverted ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 icon-success" />
              <Typography variant="body-sm" color="success">
                Converted
              </Typography>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={isConverting}
              className="convert-button"
            >
              {isConverting ? "Converting..." : "Convert"}
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityCard;