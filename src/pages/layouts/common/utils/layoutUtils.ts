// components/features/layouts/common/utils/layoutUtils.ts

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 7) return date.toLocaleDateString();
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  };
  
  /**
   * Format a date in a journal style
   */
  export const formatJournalDate = (date: Date): string => {
    // Format like "the 12th of June"
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    
    // Add suffix to day
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    
    return `the ${day}${suffix} of ${month}`;
  };
  
  /**
   * Get content type icon name based on type
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
  
  /**
   * Calculate completion percentage for objectives
   */
  export const calculateCompletionPercentage = (objectives: {completed: boolean}[]): number => {
    if (!objectives || objectives.length === 0) return 0;
    const completedCount = objectives.filter(obj => obj.completed).length;
    return Math.round((completedCount / objectives.length) * 100);
  };