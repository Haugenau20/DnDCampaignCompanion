// src/components/features/notes/NoteCard.tsx
import React from "react";
import { Note } from "../../../types/note";
import Typography from "../../core/Typography";
import Card from "../../core/Card";
import Button from "../../core/Button";
import { useNavigation } from "../../../hooks/useNavigation";
import { Calendar, Tag } from 'lucide-react';

interface NoteCardProps {
  /** The note to display */
  note: Note;
}

/**
 * Card component for displaying a user note in a list
 */
const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  const { navigateToPage } = useNavigation();
  
  /**
   * Navigate to the note detail page
   */
  const handleViewNote = () => {
    navigateToPage(`/notes/${note.id}`);
  };

  /**
   * Format a date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  /**
   * Get the status badge class based on note status
   */
  const getStatusBadgeClass = (): string => {
    switch (note.status) {
      case "active":
        return "status-active";
      case "archived":
        return "status-archived";
      default:
        return "";
    }
  };

  // Calculate entity counts
  const entityCounts = ['npc', 'location', 'quest', 'rumor'].reduce((acc, type) => {
    acc[type] = note.extractedEntities.filter(e => e.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card 
      hoverable 
      onClick={handleViewNote}
      className="note-card"
    >
      <Card.Content className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Title and status */}
            <div className="flex items-center gap-2 mb-2">
              <Typography variant="h4">
                {note.title || "Untitled Note"}
              </Typography>
              
              {note.status === "archived" && (
                <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeClass()}`}>
                  Archived
                </span>
              )}
            </div>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 typography-secondary" />
                <Typography variant="body-sm" color="secondary">
                  Updated: {formatDate(note.updatedAt)}
                </Typography>
              </div>
              {note.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 typography-secondary" />
                  <Typography variant="body-sm" color="secondary">
                    {note.tags.join(", ")}
                  </Typography>
                </div>
              )}
            </div>

            {/* Content preview */}
            <Typography variant="body-sm" color="secondary" className="line-clamp-2">
              {note.content ? note.content.substring(0, 150) + (note.content.length > 150 ? "..." : "") : "No content yet"}
            </Typography>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default NoteCard;