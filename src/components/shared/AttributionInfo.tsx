import React, { useEffect } from 'react';
import Typography from '../core/Typography';
import { Scroll, Edit } from 'lucide-react';
import { determineAttributionActor } from '../../utils/attribution-utils';
import { useUsernameLookup } from '../../context/firebase';

interface AttributionInfoProps {
  /** Complete item object containing attribution data */
  item: {
    createdByUsername?: string;
    createdBy?: string;
    dateAdded?: string;
    modifiedByUsername?: string;
    modifiedBy?: string;
    dateModified?: string;
  };
}

/**
 * Component that displays attribution information (creator and modifier)
 * Uses standardized attribution prioritization logic
 */
const AttributionInfo: React.FC<AttributionInfoProps> = ({
  item
}) => {
  // Get username lookup functionality
  const { lookupUsernames, usernameMap } = useUsernameLookup();
  
  // Fetch any missing usernames when the component mounts
  useEffect(() => {
    const uidsToLookup: string[] = [];
    
    if (item.createdBy && !item.createdByUsername) {
      uidsToLookup.push(item.createdBy);
    }
    
    if (item.modifiedBy && !item.modifiedByUsername) {
      uidsToLookup.push(item.modifiedBy);
    }
    
    if (uidsToLookup.length > 0) {
      lookupUsernames(uidsToLookup);
    }
  }, [item.createdBy, item.modifiedBy, lookupUsernames]);
  
  // Get effective usernames using prioritization logic
  const effectiveCreator = determineAttributionActor({
    createdByUsername: item.createdByUsername,
    createdBy: item.createdBy
  }, usernameMap);
  
  const effectiveModifier = determineAttributionActor({
    modifiedByUsername: item.modifiedByUsername,
    modifiedBy: item.modifiedBy
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