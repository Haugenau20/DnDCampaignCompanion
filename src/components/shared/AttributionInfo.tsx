import React, { useEffect, useState } from 'react';
import Typography from '../core/Typography';
import { Scroll, Edit } from 'lucide-react';
import { determineAttributionActor, fetchAttributionUsernames } from '../../utils/attribution-utils';
import { useFirebase } from '../../context/firebase';
import firebaseServices from '../../services/firebase';

interface AttributionInfoProps {
  /** Complete item object containing attribution data */
  item: {
    // Basic attribution fields
    createdByUsername?: string;
    createdBy?: string;
    dateAdded?: string;
    modifiedByUsername?: string;
    modifiedBy?: string;
    dateModified?: string;
    // Character-specific attribution fields
    createdByCharacterId?: string | null;
    createdByCharacterName?: string | null;
    modifiedByCharacterId?: string | null;
    modifiedByCharacterName?: string | null;
  };
}

/**
 * Component that displays attribution information (creator and modifier)
 * Uses standardized attribution prioritization logic
 */
const AttributionInfo: React.FC<AttributionInfoProps> = ({
  item
}) => {
  // Access Firebase context for current group
  const { activeGroupId } = useFirebase();
  
  // State to store username/character mapping
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Fetch usernames when component mounts - only as fallback
  useEffect(() => {
    const loadUsernames = async () => {
      if (!activeGroupId) return;
      
      // Only fetch usernames if we don't already have character names
      const uidsToLookup: string[] = [];
      
      if (item.createdBy && !item.createdByUsername && !item.createdByCharacterName) {
        uidsToLookup.push(item.createdBy);
      }
      
      if (item.modifiedBy && !item.modifiedByUsername && !item.modifiedByCharacterName) {
        uidsToLookup.push(item.modifiedBy);
      }
      
      if (uidsToLookup.length > 0) {
        setLoading(true);
        try {
          const userMapping = await fetchAttributionUsernames(
            activeGroupId, 
            uidsToLookup, 
            firebaseServices
          );
          
          setUsernameMap(userMapping);
        } catch (err) {
          console.error('Error fetching attribution usernames:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadUsernames();
  }, [item.createdBy, item.modifiedBy, activeGroupId, item.createdByUsername, item.createdByCharacterName, item.modifiedByUsername, item.modifiedByCharacterName]);
  
  // Get attribution actors using priority logic
  const effectiveCreator = determineAttributionActor({
    createdByUsername: item.createdByUsername,
    createdBy: item.createdBy,
    createdByCharacterName: item.createdByCharacterName
  }, usernameMap);
  
  const effectiveModifier = determineAttributionActor({
    modifiedByUsername: item.modifiedByUsername,
    modifiedBy: item.modifiedBy,
    modifiedByCharacterName: item.modifiedByCharacterName
  }, usernameMap);

  // If no attribution information is available, don't render anything
  if (!effectiveCreator && !effectiveModifier) return null;

  // Only show modifier info if it's different from creator or if modified later
  const showModifiedInfo = effectiveModifier && 
    item.dateModified && 
    (effectiveModifier !== effectiveCreator || 
    new Date(item.dateModified).getTime() > new Date(item.dateAdded || '').getTime() + 1000);

  return (
    <div className="space-y-1">
      {/* Creator attribution */}
      {effectiveCreator && item.dateAdded && (
        <div className="flex items-center gap-2 mt-1">
          <Scroll size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Added by {effectiveCreator} on {new Date(item.dateAdded).toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}

      {/* Modifier attribution */}
      {showModifiedInfo && item.dateModified && (
        <div className="flex items-center gap-2 mt-1">
          <Edit size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Modified by {effectiveModifier} on {new Date(item.dateModified).toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default AttributionInfo;