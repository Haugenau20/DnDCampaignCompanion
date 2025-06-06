// src/components/features/notes/EntityCard.tsx
import React, { useState } from "react";
import { ExtractedEntity, EntityType } from "../../../types/note";
import Typography from "../../core/Typography";
import Button from "../../core/Button";
import Card from "../../core/Card";
import { useNotes } from "../../../context/NoteContext";
import { Users, MapPin, Scroll, MessageSquare, FileQuestion, Check, Plus, Loader2 } from 'lucide-react';

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
   * Get the appropriate icon component for each entity type
   */
  const getEntityIcon = (type: EntityType): React.ReactNode => {
    switch (type) {
      case "npc":
        return <Users className="w-5 h-5" />;
      case "location":
        return <MapPin className="w-5 h-5" />;
      case "quest":
        return <Scroll className="w-5 h-5" />;
      case "rumor":
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <FileQuestion className="w-5 h-5" />; 
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
    if (confidence >= 0.8) return "typography-success";
    if (confidence >= 0.5) return "status-unknown";
    return "typography-error";
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
      className={`border-l-4 ${entity.isConverted ? "status-completed" : "status-active"}`}
    >
      <Card.Content className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 primary">
            {getEntityIcon(entity.type)}
          </div>
          
          <div className="flex-1">
            <Typography variant="body" className="font-medium text-trasform capitalize">
              {entity.text}
            </Typography>
            
            <Typography variant="body-sm" color="secondary">
              {getEntityTypeName(entity.type)} • 
              <span className={`${getConfidenceColorClass(entity.confidence)} ml-1`}>
                Confidence: {(entity.confidence * 100).toFixed(0)}%
              </span>
            </Typography>
          </div>
          
          {entity.isConverted ? (
            <div className="flex items-center gap-2">
              <Check className="success-icon" />
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvert}
              disabled={isConverting}
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityCard;