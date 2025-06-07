// components/features/layouts/common/utils/contentTypeUtils.tsx
import React from 'react';
import { BookOpen, User, Scroll, MessageSquare, MapPin, Clock } from 'lucide-react';

/**
 * Get the appropriate icon component based on content type
 * @param type The type of content
 * @param size Optional size for the icon (default: 16)
 * @returns React element containing the appropriate icon
 */
export const getContentIcon = (type: string, size: number = 16) => {
  switch (type) {
    case 'chapter':
      return <BookOpen size={size} />;
    case 'npc':
      return <User size={size} />;
    case 'quest':
      return <Scroll size={size} />;
    case 'rumor':
      return <MessageSquare size={size} />;
    case 'location':
      return <MapPin size={size} />;
    default:
      return <Clock size={size} />;
  }
};

/**
 * Get a display label for a content type
 * @param type The content type
 * @returns Human-readable label for the type
 */
export const getContentTypeLabel = (type: string): string => {
  switch (type) {
    case 'chapter':
      return 'Story';
    case 'npc':
      return 'NPC';
    case 'quest':
      return 'Quest';
    case 'rumor':
      return 'Rumor';
    case 'location':
      return 'Location';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};
