// Updated components/features/dashboard/GlobalActionButton.tsx

import React, { useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useNotes } from '../../context/NoteContext';
import { Plus, BookOpen, User, Scroll, MessageSquare, MapPin, FileText, X } from 'lucide-react';
import Button from '../core/Button';
import clsx from 'clsx';

/**
 * GlobalActionButton component that provides a floating action button for creating content
 */
const GlobalActionButton: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { createNote } = useNotes();
  
  // State for open/closed
  const [isOpen, setIsOpen] = useState(false);
  
  /**
   * Handle creating a new note
   * Creates a new note locally and navigates to the note editor instantly
   */
  const handleCreateNote = async () => {
    try {
      // Create note locally (no Firebase operations, so it's instant)
      const noteId = await createNote("New Note", "");
      // Navigate immediately since note creation is now instant
      navigateToPage(`/notes/${noteId}`);
      setIsOpen(false); // Close menu after creation
    } catch (error) {
      console.error("Failed to create note:", error);
      // Note: Error handling is managed by the NoteContext
    }
  };
  
  // Navigation actions
  const actions = [
    {
      label: 'New Note',
      icon: <FileText className="w-5 h-5" />,
      onClick: handleCreateNote
    },
    {
      label: 'New Location',
      icon: <MapPin className="w-5 h-5" />,
      onClick: () => navigateToPage('/locations/create')
    },
    {
      label: 'New NPC',
      icon: <User className="w-5 h-5" />,
      onClick: () => navigateToPage('/npcs/create')
    },
    {
      label: 'New Rumor',
      icon: <MessageSquare className="w-5 h-5" />,
      onClick: () => navigateToPage('/rumors/create')
    },
    {
      label: 'New Quest',
      icon: <Scroll className="w-5 h-5" />,
      onClick: () => navigateToPage('/quests/create')
    },
    {
      label: 'New Chapter',
      icon: <BookOpen className="w-5 h-5" />,
      onClick: () => navigateToPage('/story/chapters/create')
    }
  ];
  
  // Toggle open/closed
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle action click
  const handleActionClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };
  
  return (
    <div className="fixed right-6 bottom-6 z-40">
      {/* Action menu */}
      {isOpen && (
        <div className="mb-4 flex flex-col-reverse gap-3">
          {actions.map((action, index) => (
            <Button
              variant='primary'
              startIcon={action.icon}
              key={index}
              onClick={() => handleActionClick(action.onClick)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      )}
      
      {/* Main action button */}
      <Button
        variant="primary"
        onClick={toggleOpen}
        className={clsx(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-500",
          isOpen && "transform rotate-90 duration-500"
        )}
        aria-label={isOpen ? "Close action menu" : "Open action menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </Button>
    </div>
  );
};

export default GlobalActionButton;