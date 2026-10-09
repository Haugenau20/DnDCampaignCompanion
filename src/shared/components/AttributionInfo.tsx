import React from 'react';
import Typography from 'core/components/Typography';
import { Scroll, Edit } from 'lucide-react';
import { recordTimes } from 'core/attribution';
import type { ContentAttribution } from 'core/types/common';
import { useMemberDirectory } from '../hooks/useMemberDirectory';
import { authorName, creatorRef, modifierRef } from '../utils/author-name';

interface AttributionInfoProps {
  /** Complete item object containing attribution data */
  item: Partial<ContentAttribution>;
}

/** Creation stamps the editor too, at the same moment; within this it is one event. */
const SAME_EVENT_MS = 1000;

/**
 * Who added a record and who last changed it, and when.
 *
 * Names are the authors' current ones (T132): the character they wrote as,
 * else their username, looked up in the group's members -- so a renamed
 * character is renamed here too. The name stored with the record is used
 * only for someone who has left the group. Times are the server's where the
 * record has them, else the strings every older record carries.
 */
const AttributionInfo: React.FC<AttributionInfoProps> = ({ item }) => {
  const directory = useMemberDirectory();
  const creator = authorName(creatorRef(item), directory);
  const modifier = authorName(modifierRef(item), directory);
  const { created, modified } = recordTimes(item);
  const wasModified = Boolean(item.modifiedAt || item.dateModified);

  if (!creator && !modifier) return null;

  // Only a change by someone else, or a real while later, is worth a line.
  const showModifiedInfo =
    Boolean(modifier) &&
    wasModified &&
    modified !== null &&
    (modifier !== creator || !created || modified.getTime() > created.getTime() + SAME_EVENT_MS);

  return (
    <div className="space-y-1">
      {creator && created && (
        <div className="flex items-center gap-2 mt-1">
          <Scroll size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Added by {creator} on {created.toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}

      {showModifiedInfo && modified && (
        <div className="flex items-center gap-2 mt-1">
          <Edit size={14} className="typography-secondary" />
          <Typography variant="body-sm" color="secondary">
            Modified by {modifier} on {modified.toLocaleDateString('en-uk')}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default AttributionInfo;
