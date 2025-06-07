// components/features/layouts/journal/sections/CharacterGallery.tsx
import React from 'react';
import { useNavigation } from '../../../../../context/NavigationContext';
import { NPC } from '../../../../../types/npc';
import { User, Users } from 'lucide-react';

interface CharacterGalleryProps {
  npcs: NPC[];
  loading: boolean;
}

/**
 * Displays a gallery of character sketches in a journal style
 */
const CharacterGallery: React.FC<CharacterGalleryProps> = ({ npcs, loading }) => {
  const { navigateToPage } = useNavigation();

  const handleNpcClick = (npcId: string) => {
    navigateToPage(`/npcs?highlight=${npcId}`);
  };

  return (
    <div className="relative journal-section">
      <h3 className="text-lg font-medium mb-3 journal-heading">
        Notable Characters ({loading ? '...' : npcs.length})
      </h3>

      {loading ? (
        <div className="flex flex-wrap gap-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="w-24 h-24 rounded-lg journal-loading"
            ></div>
          ))}
        </div>
      ) : npcs.length === 0 ? (
        <div className="text-center py-4 journal-empty">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm italic">No characters yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {npcs.slice(0, 6).map(npc => (
            <div 
              key={npc.id}
              onClick={() => handleNpcClick(npc.id)}
              className="p-2 rounded-lg cursor-pointer transition-transform hover:scale-105 journal-character-card"
            >
              <div className="flex flex-col items-center text-center">
                {/* Character sketch circle */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 journal-character-sketch">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium line-clamp-1 journal-character-name">
                  {npc.name}
                </span>
                {npc.race && (
                  <span className="text-xs opacity-75 italic line-clamp-1">
                    {npc.race}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {npcs.length > 6 && (
        <div className="text-right mt-1 journal-more-note">
          ...and {npcs.length - 6} more
        </div>
      )}
    </div>
  );
};

export default CharacterGallery;