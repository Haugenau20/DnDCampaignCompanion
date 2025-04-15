// src/utils/content-tracker.ts
import { RecentContent } from '../components/features/layouts/dashboard/sections/ContinueReading';

// Local storage key for recently viewed content
const RECENT_CONTENT_KEY = 'dnd-companion-recent-content';

/**
 * Generate appropriate view link for content type
 * Uses view pages where available, otherwise goes to list page with highlight parameter
 */
export const getContentViewLink = (
  id: string,
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location'
): string => {
  switch (type) {
    case 'chapter':
      return `/story/chapters/${id}`;
    case 'npc':
      return `/npcs?highlight=${id}`;
    case 'quest':
      return `/quests?highlight=${id}`;
    case 'rumor':
      return `/rumors?highlight=${id}`;
    case 'location':
      return `/locations?highlight=${id}`;
    default:
      return `/`;
  }
};

/**
 * Track content view for the "Continue Reading" dashboard section
 * Call this function when a user views a content item
 */
export const trackContentView = (
  id: string,
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location',
  title: string,
  link?: string
): void => {
  try {
    // Generate the appropriate view link if not provided
    const viewLink = link || getContentViewLink(id, type);
    
    // Get existing recent content from localStorage
    const storedContent = localStorage.getItem(RECENT_CONTENT_KEY);
    let recentItems: RecentContent[] = [];
    
    if (storedContent) {
      // Parse and convert dates if needed
      recentItems = JSON.parse(storedContent).map((item: any) => ({
        ...item,
        lastViewed: new Date(item.lastViewed)
      }));
    }
    
    // Remove this item if it already exists (to update its position/time)
    recentItems = recentItems.filter(item => !(item.id === id && item.type === type));
    
    // Add the new/updated item at the beginning
    recentItems.unshift({
      id,
      type,
      title,
      lastViewed: new Date(),
      link: viewLink
    });
    
    // Keep only the 10 most recent items
    if (recentItems.length > 10) {
      recentItems = recentItems.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem(RECENT_CONTENT_KEY, JSON.stringify(recentItems));
  } catch (error) {
    console.error('Error tracking content view:', error);
  }
};

/**
 * Get recently viewed content items
 * @returns Array of recently viewed content
 */
export const getRecentContent = (): RecentContent[] => {
  try {
    const storedContent = localStorage.getItem(RECENT_CONTENT_KEY);
    if (!storedContent) return [];
    
    // Parse and convert dates
    return JSON.parse(storedContent).map((item: any) => ({
      ...item,
      lastViewed: new Date(item.lastViewed)
    }));
  } catch (error) {
    console.error('Error getting recent content:', error);
    return [];
  }
};

/**
 * Clear all recent content tracking data
 */
export const clearRecentContent = (): void => {
  localStorage.removeItem(RECENT_CONTENT_KEY);
};