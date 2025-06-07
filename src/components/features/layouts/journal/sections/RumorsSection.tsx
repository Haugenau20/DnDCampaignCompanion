// components/features/layouts/journal/sections/RumorsSection.tsx
import React from 'react';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Rumor } from '../../../../../types/rumor';
import { MessageSquare, Check, X, HelpCircle } from 'lucide-react';

interface RumorsSectionProps {
  rumors: Rumor[];
  loading: boolean;
}

/**
 * Displays a list of rumors in journal style
 */
const RumorsSection: React.FC<RumorsSectionProps> = ({ rumors, loading }) => {
  const { navigateToPage } = useNavigation();

  // Sort rumors by verification status, then by date (newest first)
  const sortedRumors = [...rumors].sort((firstRumor, secondRumor) => {
    // First by status priority: confirmed, unconfirmed, false
    const statusPriority: Record<string, number> = {
      confirmed: 0,
      unconfirmed: 1,
      false: 2
    };
    
    const firstPriority = statusPriority[firstRumor.status] ?? 1;
    const secondPriority = statusPriority[secondRumor.status] ?? 1;
    
    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }
    
    // Then by date (newest first)
    const firstDate = firstRumor.dateAdded ? new Date(firstRumor.dateAdded).getTime() : 0;
    const secondDate = secondRumor.dateAdded ? new Date(secondRumor.dateAdded).getTime() : 0;
    
    return secondDate - firstDate;
  });
  
  // Get status icon based on rumor status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check size={14} className="rumor-status-confirmed" />;
      case 'false':
        return <X size={14} className="rumor-status-false" />;
      case 'unconfirmed':
      default:
        return <HelpCircle size={14} className="rumor-status-unconfirmed" />;
    }
  };
  
  // Handle rumor click
  const handleRumorClick = (rumorId: string) => {
    navigateToPage(`/rumors?highlight=${rumorId}`);
  };

  return (
    <div className="relative journal-section">
      <h3 className="text-lg font-medium mb-3 journal-heading">
        Recent Rumors ({loading ? '...' : rumors.length})
      </h3>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map(index => (
            <div 
              key={index}
              className="h-16 rounded journal-loading"
            ></div>
          ))}
        </div>
      ) : sortedRumors.length === 0 ? (
        <div className="text-center py-4 journal-empty">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm italic">No rumors gathered yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRumors.slice(0, 3).map((rumor) => (
            <div
              key={rumor.id}
              onClick={() => handleRumorClick(rumor.id)}
              className="p-2 rounded cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(rumor.status)}
                    <span className="text-sm font-medium journal-title">
                      {rumor.title}
                    </span>
                  </div>
                  
                  <p className="text-xs mt-1 line-clamp-2 italic">
                    "{rumor.content}"
                  </p>
                  
                  {rumor.sourceName && (
                    <p className="text-xs mt-1 text-right typography-secondary">
                      — {rumor.sourceName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {sortedRumors.length > 3 && (
            <div className="text-right text-xs italic journal-more-note">
              ...and {sortedRumors.length - 3} more rumors
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RumorsSection;