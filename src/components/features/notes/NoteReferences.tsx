// src/components/features/notes/NoteReferences.tsx
import React, { useState, useEffect } from "react";
import { EntityReference, getEntitiesForNote, unlinkNoteFromEntity } from "../../../utils/note-relationships";
import { EntityType } from "../../../types/note";
import Typography from "../../core/Typography";
import Card from "../../core/Card";
import Button from "../../core/Button";
import { useNavigation } from "../../../hooks/useNavigation";

interface NoteReferencesProps {
  /** ID of the note to display references for */
  noteId: string;
}

/**
 * Component for displaying and managing related campaign elements
 */
const NoteReferences: React.FC<NoteReferencesProps> = ({ noteId }) => {
  const [references, setReferences] = useState<EntityReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { navigateToPage } = useNavigation();

  // Load references on mount and when noteId changes
  useEffect(() => {
    loadReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  /**
   * Load entity references for this note
   */
  const loadReferences = async () => {
    try {
      setIsLoading(true);
      const refs = await getEntitiesForNote(noteId);
      setReferences(refs);
    } catch (error) {
      console.error("Failed to load references:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unlink an entity from this note
   */
  const handleUnlink = async (entityId: string, entityType: string) => {
    try {
      await unlinkNoteFromEntity(noteId, entityId, entityType as EntityType);
      setReferences(prev => prev.filter(ref => ref.id !== entityId));
    } catch (error) {
      console.error("Failed to unlink reference:", error);
    }
  };

  /**
   * Navigate to the entity detail page
   */
  const navigateToEntity = (reference: EntityReference) => {
    const paths: Record<string, string> = {
      npc: "/npcs",
      location: "/locations",
      quest: "/quests",
      rumor: "/rumors",
      item: "/items"
    };
    
    const path = paths[reference.type];
    if (path) {
      navigateToPage(`${path}/edit/${reference.id}`);
    }
  };

  /**
   * Get entity type display name
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
      case "item":
        return "Item";
      default:
        return type;
    }
  };

  /**
   * Get icon class for entity type
   */
  const getEntityIconClass = (type: EntityType): string => {
    return `icon-${type}`;
  };

  return (
    <Card className={`note-references`}>
      <Card.Content>
        <Typography variant="h4" className="mb-4">
          Related Campaign Elements
        </Typography>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className={`w-5 h-5 mr-3 icon-loading`} />
            <Typography color="secondary">Loading references...</Typography>
          </div>
        )}
        
        {/* References list */}
        {!isLoading && references.length > 0 && (
          <div className="space-y-2">
            {references.map(reference => (
              <div 
                key={reference.id}
                className={`flex items-center justify-between p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors reference-item`}
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => navigateToEntity(reference)}
                >
                  <div className={`w-5 h-5 ${getEntityIconClass(reference.type)}`} />
                  <div>
                    <Typography variant="body" className="font-medium">
                      {reference.id}
                    </Typography>
                    <Typography variant="body-sm" color="secondary">
                      {getEntityTypeName(reference.type)}
                    </Typography>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToEntity(reference)}
                    className={`view-button`}
                  >
                    <div className={`w-4 h-4 icon-chevron-right`} />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(reference.id, reference.type)}
                    className={`unlink-button`}
                  >
                    <div className={`w-4 h-4 icon-trash`} />
                    Unlink
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && references.length === 0 && (
          <Typography color="secondary">
            No related campaign elements yet
          </Typography>
        )}
      </Card.Content>
    </Card>
  );
};

export default NoteReferences;