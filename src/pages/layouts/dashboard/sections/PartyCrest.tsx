// src/pages/layouts/dashboard/sections/PartyCrest.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import ImageSlot from 'core/components/ImageSlot';
import { crestPrefix } from 'core/services/firebase/storage/ImageStorageService';
import { useGroups } from 'features/user-management';
import ImageUploadControl from 'shared/components/ImageUploadControl';
import { useImageAttachment } from 'shared/hooks/useImageAttachment';
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
 * It carries the group's crest. Most groups will have none for most of their
 * life, so the empty state is the design rather than a placeholder: a hatched
 * panel drawn from the page's own tokens, which reads as a reserved space
 * rather than a missing image.
 *
 * Every member sees the crest; only group admins may change it, matching who
 * may edit the group document (and `storage.rules.prod`).
 *
 * This identifies the group -- who is at the table -- which is why it sits here
 * and not in the hero. The hero names the campaign; a second monogram up there
 * only repeated the campaign title's first letter back at it.
 */
const PartyCrest: React.FC<PartyCrestProps> = ({ memberCount, chapterCount }) => {
  const { activeGroup, hasGroup } = useCampaignInfo();
  const { activeGroupId, isAdmin, setGroupCrest } = useGroups();

  const crest = useImageAttachment({
    prefix: activeGroupId ? crestPrefix(activeGroupId) : null,
    current: activeGroup?.crest,
    save: setGroupCrest,
  });

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
        image={activeGroup.crest}
        alt={`${activeGroup.name} crest`}
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
        {isAdmin && (
          <ImageUploadControl
            className="mt-3"
            subject="crest"
            hasImage={Boolean(activeGroup.crest)}
            onUpload={crest.upload}
            onRemove={crest.remove}
          />
        )}
      </div>
    </div>
  );
};

export default PartyCrest;
