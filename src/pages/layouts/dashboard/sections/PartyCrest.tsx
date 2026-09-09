// src/pages/layouts/dashboard/sections/PartyCrest.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import ImageSlot from 'core/components/ImageSlot';
import { useCampaignInfo } from '../../common/hooks/useCampaignInfo';

interface PartyCrestProps {
  /** Player count, shown in the summary line when the group has members. */
  memberCount?: number;
  /** Chapter count, shown alongside it. */
  chapterCount?: number;
}

/**
 * The party's own card, at the foot of the aside.
 *
 * It carries an image slot for a crest the group may upload one day. That slot
 * is empty now and will be empty for most groups most of the time, so the empty
 * state is the design rather than a placeholder: a hatched panel drawn from the
 * page's own tokens, which reads as a reserved space rather than a missing
 * image.
 *
 * This identifies the group -- who is at the table -- which is why it sits here
 * and not in the hero. The hero names the campaign; a second monogram up there
 * only repeated the campaign title's first letter back at it.
 */
const PartyCrest: React.FC<PartyCrestProps> = ({ memberCount, chapterCount }) => {
  const { activeGroup, hasGroup } = useCampaignInfo();

  if (!hasGroup || !activeGroup?.name) return null;

  const summary = [
    memberCount ? `${memberCount} ${memberCount === 1 ? 'player' : 'players'}` : null,
    chapterCount ? `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg overflow-hidden card" data-testid="party-crest">
      <ImageSlot
        className="h-28"
        label={`${activeGroup.name} crest — none uploaded yet`}
      />
      <div className="px-5 py-4">
        <Typography variant="h4" className="text-base">
          {activeGroup.name}
        </Typography>
        {summary.length > 0 && (
          <Typography variant="body-sm" color="muted" className="text-xs mt-1">
            {summary.join(' · ')}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default PartyCrest;
