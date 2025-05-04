// src/components/features/notes/NoteReferences.tsx
import React, { useState, useEffect } from "react";
import { EntityType } from "../../../types/note";
import Typography from "../../core/Typography";
import Card from "../../core/Card";
import Button from "../../core/Button";
import { useNavigation } from "../../../hooks/useNavigation";
import { useNotes } from "../../../context/NoteContext";
import DocumentService from "../../../services/firebase/data/DocumentService";
import { Loader2, Users, MapPin, Scroll, MessageSquare, ExternalLink } from 'lucide-react';

export interface PotentialReference {
  id: string;
  type: EntityType;
  title: string;
  name?: string;
  matchingText: string[];
}

interface NoteReferencesProps {
  /** ID of the note to find references for */
  noteId: string;
  /** Callback to expose found references */
  onReferencesFound?: (references: PotentialReference[]) => void;
}

/**
 * Normalize text for consistent comparison
 * This function should be used by both NoteReferences and EntityExtractor
 */
export const normalizeTextForComparison = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[.,!?;:\s]+/g, '-') // Replace punctuation and spaces with dashes
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .trim();
};

/**
 * Component for finding and displaying potential campaign element references in notes
 */
const NoteReferences: React.FC<NoteReferencesProps> = ({ noteId, onReferencesFound }) => {
  const [references, setReferences] = useState<PotentialReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { navigateToPage } = useNavigation();
  const { getNoteById } = useNotes();
  const documentService = DocumentService.getInstance();

  // Find references when component mounts or noteId changes
  useEffect(() => {
    findReferences();
  }, [noteId]);

  // Notify parent when references are found
  useEffect(() => {
    if (onReferencesFound) {
      onReferencesFound(references);
    }
  }, [references, onReferencesFound]);

  /**
   * Find campaign elements that actually appear in the note text
   * Uses case and whitespace insensitive matching
   */
  const findReferences = async () => {
    try {
      setIsLoading(true);
      const note = getNoteById(noteId);
      if (!note || !note.content) {
        setReferences([]);
        return;
      }

      // Get all campaign elements
      const [npcs, locations, quests, rumors] = await Promise.all([
        documentService.getCollection<any>('npcs'),
        documentService.getCollection<any>('locations'),
        documentService.getCollection<any>('quests'),
        documentService.getCollection<any>('rumors')
      ]);

      const potentialReferences: PotentialReference[] = [];
      const noteContent = note.content;
      const normalizedNoteContent = normalizeTextForComparison(noteContent);

      // Check NPCs
      npcs.forEach(npc => {
        const matchingText: string[] = [];
        
        // Check name
        if (npc.name) {
          const normalizedName = normalizeTextForComparison(npc.name);
          if (normalizedNoteContent.includes(normalizedName)) {
            matchingText.push(npc.name);
          }
        }
        
        // Check title if different from name
        if (npc.title && npc.title !== npc.name) {
          const normalizedTitle = normalizeTextForComparison(npc.title);
          if (normalizedNoteContent.includes(normalizedTitle)) {
            matchingText.push(npc.title);
          }
        }
        
        if (matchingText.length > 0) {
          potentialReferences.push({
            id: npc.id,
            type: 'npc',
            title: npc.name || npc.title || 'Unnamed NPC',
            name: npc.name,
            matchingText: matchingText
          });
        }
      });

      // Check Locations
      locations.forEach(location => {
        const matchingText: string[] = [];
        
        if (location.name) {
          const normalizedName = normalizeTextForComparison(location.name);
          if (normalizedNoteContent.includes(normalizedName)) {
            matchingText.push(location.name);
          }
        }
        
        if (location.title && location.title !== location.name) {
          const normalizedTitle = normalizeTextForComparison(location.title);
          if (normalizedNoteContent.includes(normalizedTitle)) {
            matchingText.push(location.title);
          }
        }
        
        if (matchingText.length > 0) {
          potentialReferences.push({
            id: location.id,
            type: 'location',
            title: location.name || location.title || 'Unnamed Location',
            name: location.name,
            matchingText: matchingText
          });
        }
      });

      // Check Quests
      quests.forEach(quest => {
        const matchingText: string[] = [];
        
        if (quest.title) {
          const normalizedTitle = normalizeTextForComparison(quest.title);
          if (normalizedNoteContent.includes(normalizedTitle)) {
            matchingText.push(quest.title);
          }
        }
        
        if (quest.name && quest.name !== quest.title) {
          const normalizedName = normalizeTextForComparison(quest.name);
          if (normalizedNoteContent.includes(normalizedName)) {
            matchingText.push(quest.name);
          }
        }
        
        if (matchingText.length > 0) {
          potentialReferences.push({
            id: quest.id,
            type: 'quest',
            title: quest.title || quest.name || 'Unnamed Quest',
            name: quest.name,
            matchingText: matchingText
          });
        }
      });

      // Check Rumors
      rumors.forEach(rumor => {
        const matchingText: string[] = [];
        
        if (rumor.title) {
          const normalizedTitle = normalizeTextForComparison(rumor.title);
          if (normalizedNoteContent.includes(normalizedTitle)) {
            matchingText.push(rumor.title);
          }
        }
        
        if (rumor.name && rumor.name !== rumor.title) {
          const normalizedName = normalizeTextForComparison(rumor.name);
          if (normalizedNoteContent.includes(normalizedName)) {
            matchingText.push(rumor.name);
          }
        }
        
        if (matchingText.length > 0) {
          potentialReferences.push({
            id: rumor.id,
            type: 'rumor',
            title: rumor.title || rumor.name || 'Unnamed Rumor',
            name: rumor.name,
            matchingText: matchingText
          });
        }
      });

      setReferences(potentialReferences);
    } catch (error) {
      console.error("Failed to find references:", error);
      setReferences([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to the entity detail page
   */
  const navigateToEntity = (reference: PotentialReference) => {
    const paths: Record<string, string> = {
      npc: "/npcs",
      location: "/locations",
      quest: "/quests",
      rumor: "/rumors"
    };
    
    const path = paths[reference.type];
    if (path) {
      navigateToPage(`${path}?highlight=${reference.id}`);
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
      default:
        return type;
    }
  };

  /**
   * Get icon for entity type
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
        return null;
    }
  };

  return (
    <Card className="note-references">
      <Card.Content>
        <Typography variant="h4" className="mb-4">
          Campaign References Found
        </Typography>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 mr-3 animate-spin primary" />
            <Typography color="secondary">Searching for references...</Typography>
          </div>
        )}
        
        {/* References list */}
        {!isLoading && references.length > 0 && (
          <div className="space-y-2">
            {references.map((reference, index) => (
              <div 
                key={`${reference.type}-${reference.id}-${index}`}
                className="flex items-center justify-between p-3 card transition-colors reference-item"
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => navigateToEntity(reference)}
                >
                  <div className="primary">
                    {getEntityIcon(reference.type)}
                  </div>
                    <div className="flex justify-between w-full">
                    <Typography variant="body" className="font-medium">
                      {reference.title}
                    </Typography>
                    <Typography variant="body-sm" color="secondary" className="italic">
                      {getEntityTypeName(reference.type)}
                    </Typography>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && references.length === 0 && (
          <Typography color="secondary">
            No campaign elements found that match content in this note
          </Typography>
        )}
      </Card.Content>
    </Card>
  );
};

export default NoteReferences;