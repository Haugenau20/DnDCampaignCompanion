import React from 'react';
import Typography from '../core/Typography';
import { Scroll, Edit } from 'lucide-react';

interface AttributionInfoProps {
  /** Username of the person who created the item */
  createdByUsername?: string;
  /** Date when the item was created */
  dateAdded?: string;
  /** Username of the person who last modified the item */
  modifiedByUsername?: string;
  /** Date when the item was last modified */
  dateModified?: string;
}

/**
 * Component that displays attribution information (creator and modifier)
 * Used in both NPC and Quest cards to follow DRY principles
 */
const AttributionInfo: React.FC<AttributionInfoProps> = ({
  createdByUsername,
  dateAdded,
  modifiedByUsername,
  dateModified
}) => {

  // If no attribution information is available, don't render anything
  if (!createdByUsername && !modifiedByUsername) return null;

  // Only show modifier info if it's different from creator or if modified later
  const showModifiedInfo = modifiedByUsername && 
    dateModified && 
    (modifiedByUsername !== createdByUsername || 
    new Date(dateModified).getTime() > new Date(dateAdded || '').getTime() + 1000);

  return (
    <div className="space-y-1">
      {/* Creator attribution */}
      {createdByUsername && (
        <div className="flex items-center gap-2 mt-1">
          <Scroll size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Added by {createdByUsername} on {new Date(dateAdded || '').toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}

      {/* Modifier attribution */}
      {showModifiedInfo && (
        <div className="flex items-center gap-2 mt-1">
          <Edit size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Modified by {modifiedByUsername} on {new Date(dateModified || '').toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default AttributionInfo;