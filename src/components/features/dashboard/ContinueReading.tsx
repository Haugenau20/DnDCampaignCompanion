// components/features/dashboard/ContinueReading.tsx
import React, { useState, useEffect, useRef } from 'react';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigation } from '../../../context/NavigationContext';
import { BookOpen, User, Scroll, MessageSquare, MapPin, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import Button from '../../core/Button';
import { NPC } from '../../../types/npc';
import { Location } from '../../../types/location';
import { Quest } from '../../../types/quest';
import { Chapter } from '../../../types/story';
import { Rumor } from '../../../types/rumor';

// Local storage key for recently viewed content
const RECENT_CONTENT_KEY = 'dnd-companion-recent-content';

// Tracking recently viewed content
export interface RecentContent {
  id: string;
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location';
  title: string;
  lastViewed: Date;
  link: string;
}

interface ContinueReadingProps {
  chapters: Chapter[];
  npcs: NPC[];
  quests: Quest[];
  rumors: Rumor[];
  locations: Location[];
}

/**
 * Helper function to track content view
 * Definition moved outside the component to avoid TS1184 error
 */
const trackContentViewInternal = (
  id: string,
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location',
  title: string,
  link: string
) => {
  try {
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
      link
    });
    
    // Keep only the 10 most recent items
    if (recentItems.length > 10) {
      recentItems = recentItems.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem(RECENT_CONTENT_KEY, JSON.stringify(recentItems));
    
    return recentItems;
  } catch (error) {
    console.error('Error tracking content view:', error);
    return [];
  }
};

/**
 * ContinueReading component that displays recently viewed content
 */
const ContinueReading: React.FC<ContinueReadingProps> = ({
  chapters,
  npcs,
  quests,
  rumors,
  locations
}) => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;
  
  // State for recently viewed content
  const [recentContent, setRecentContent] = useState<RecentContent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load recently viewed content from localStorage
  useEffect(() => {
    try {
      const storedContent = localStorage.getItem(RECENT_CONTENT_KEY);
      if (storedContent) {
        const parsedContent = JSON.parse(storedContent);
        // Convert string dates back to Date objects
        const recentItems: RecentContent[] = parsedContent.map((item: any) => ({
          ...item,
          lastViewed: new Date(item.lastViewed)
        }));
        setRecentContent(recentItems);
      }
    } catch (error) {
      console.error('Error loading recent content:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get icon based on content type
  const getIcon = (type: string) => {
    switch (type) {
      case 'chapter':
        return <BookOpen className="w-5 h-5" />;
      case 'npc':
        return <User className="w-5 h-5" />;
      case 'quest':
        return <Scroll className="w-5 h-5" />;
      case 'rumor':
        return <MessageSquare className="w-5 h-5" />;
      case 'location':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };
  
  // Get type label
  const getTypeLabel = (type: string) => {
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
        return 'Content';
    }
  };
  
  // Reference for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll left/right
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300; // Adjust as needed
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl">Continue Reading</Typography>
        
        {/* Scroll controls */}
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex gap-2 sm:gap-4 overflow-x-hidden">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="min-w-[180px] w-[180px] sm:min-w-[220px] sm:w-[220px] md:min-w-[250px] md:w-[250px] animate-pulse">
              <Card.Content className="h-32">
                <div className={clsx(
                  "w-full h-full rounded-lg",
                  `${themePrefix}-bg-secondary opacity-30`
                )}></div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : recentContent.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-8">
            <Clock className={clsx(
              "w-12 h-12 mx-auto mb-4",
              `${themePrefix}-typography-secondary`
            )} />
            <Typography variant="h4" className="mb-1">No Recent Content</Typography>
            <Typography color="secondary">
              Recently viewed content will appear here
            </Typography>
          </Card.Content>
        </Card>
      ) : (
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recentContent.map(content => (
            <Card 
              key={`${content.type}-${content.id}`}
              hoverable
              className="min-w-[200px] w-[200px]"
              onClick={() => navigateToPage(content.link)}
            >
              <Card.Content>
                <div className="flex">
                  <div className={clsx(
                    "p-2 rounded-full mr-2 h-8 w-8 flex items-center justify-center",
                    `${themePrefix}-icon-bg`
                  )}>
                    {getIcon(content.type)}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Typography variant="body-sm" color="secondary">
                      {getTypeLabel(content.type)}
                    </Typography>
                    <Typography variant="h4" className="truncate text-sm">
                      {content.title}
                    </Typography>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContinueReading;

// Export the tracking function separately to be used in other components
export const trackContentView = (
  id: string,
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location',
  title: string,
  link: string
) => {
  return trackContentViewInternal(id, type, title, link);
};