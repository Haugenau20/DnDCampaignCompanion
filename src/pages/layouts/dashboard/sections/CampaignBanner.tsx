// components/features/dashboard/CampaignBanner.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import { useCampaignInfo } from '../../../layouts/common/hooks/useCampaignInfo';

interface CampaignBannerProps {
  /**
   * Rendered at the top right of the header row — the dashboard/journal switch
   * lives here so the page does not need a third navigation layer of its own.
   */
  action?: React.ReactNode;
  /** Chapter count, shown in the meta line when the campaign has any. */
  chapterCount?: number;
}

/**
 * Campaign banner component that displays information about the current campaign.
 *
 * This is the page's title block, so it carries the type hierarchy: the campaign
 * name as a serif h1, its description as an italic standfirst, and the flat facts
 * (group, start date, chapter count) as one quiet meta line. It replaces a centred
 * "Welcome to X" block whose 320px decorative circle bled off the right edge as a
 * grey blob — that circle was only visible because of the `typograhpy` typo on this
 * component's root, and it is not reinstated here.
 */
const CampaignBanner: React.FC<CampaignBannerProps> = ({ action, chapterCount }) => {
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } = useCampaignInfo();

  // If no active campaign or group, show a default message
  if (!hasGroup || !hasCampaign) {
    return (
      <div className="py-6 mb-6 text-center typography" data-testid="campaign-banner">
        <Typography variant="h2" className="mb-2">
          Welcome to D&D Campaign Companion
        </Typography>
        <Typography color="secondary">
          {!hasGroup
            ? "Select or create a group to get started"
            : "Select or create a campaign to begin your adventure"
          }
        </Typography>
      </div>
    );
  }

  const meta = [
    activeGroup?.name,
    formattedCreationDate ? `Started ${formattedCreationDate}` : null,
    chapterCount ? `Chapter ${chapterCount}` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="pt-2 pb-6 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 typography"
      data-testid="campaign-banner"
    >
      <div className="flex flex-col gap-2 min-w-0">
        <Typography variant="h1" className="text-3xl sm:text-4xl">
          {activeCampaign?.name}
        </Typography>

        {activeCampaign?.description && (
          <Typography color="secondary" className="italic font-heading text-base sm:text-lg">
            {activeCampaign.description}
          </Typography>
        )}

        {meta.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {meta.map((item, index) => (
              <React.Fragment key={item}>
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="w-[3px] h-[3px] rounded-full bg-secondary shrink-0"
                  ></span>
                )}
                <Typography
                  variant="body-sm"
                  color={index === 0 ? 'secondary' : 'muted'}
                  className={index === 0 ? 'font-medium' : undefined}
                >
                  {item}
                </Typography>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default CampaignBanner;
