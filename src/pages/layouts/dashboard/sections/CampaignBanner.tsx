// src/pages/layouts/dashboard/sections/CampaignBanner.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import { useCampaignInfo } from '../../../layouts/common/hooks/useCampaignInfo';

interface CampaignBannerProps {
  /**
   * Rendered at the top right of the band — the dashboard/journal switch lives
   * here so the page does not need a third navigation layer of its own.
   */
  action?: React.ReactNode;
  /** Chapter count, shown in the meta line when the campaign has any. */
  chapterCount?: number;
}

/**
 * The hero band: the campaign's identity, on a surface of its own.
 *
 * This is a band rather than a block of text on the page because value contrast
 * belongs in the frame -- the chrome, the hero, the footer -- while the surfaces
 * you scan every session stay quiet. It sits one step lighter than the chrome so
 * the two read as layers of one frame rather than a single tall header, and the
 * warm page below lands as a change of material.
 *
 * The identity slot on the left is an image slot with a designed empty state.
 * Most slots will be empty most of the time, so the empty state is the real
 * design: the campaign's own sigil, derived from its id exactly as every entity
 * mark is. Nothing here depends on content a user may never add.
 */
const CampaignBanner: React.FC<CampaignBannerProps> = ({ action, chapterCount }) => {
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } =
    useCampaignInfo();

  // Cancels the page container's padding so the band spans the full content
  // width and meets the chrome above it, rather than floating as a card.
  // Cancels both the page container's padding and `main`'s, so the band meets
  // the chrome with no seam of page colour between them. Measured, not guessed:
  // main contributes 16px and the container 8px (16px at sm).
  const bandFrame =
    '-mx-6 sm:-mx-8 -mt-8 mb-8 px-6 sm:px-8 py-8 sm:py-10 hero-band';

  if (!hasGroup || !hasCampaign) {
    return (
      <div className={clsx(bandFrame, 'text-center')} data-testid="campaign-banner">
        <Typography variant="h2" className="mb-2">
          Welcome to D&D Campaign Companion
        </Typography>
        <Typography color="secondary">
          {!hasGroup
            ? 'Select or create a group to get started'
            : 'Select or create a campaign to begin your adventure'}
        </Typography>
      </div>
    );
  }

  const meta = [
    formattedCreationDate ? `Started ${formattedCreationDate}` : null,
    chapterCount ? `Chapter ${chapterCount}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={bandFrame} data-testid="campaign-banner">
      {/* Stacked until `sm`. Side by side, the `shrink-0` toggle claims ~180px of
          a 320px viewport and squeezes the title column to almost nothing, at
          which point `break-words` sets the campaign name one character per
          line. The toggle drops below the identity block instead. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div className="flex items-start gap-4 sm:gap-6 min-w-0">
          {/* The image slot. Empty by design in this phase, and designed for it. */}
          <div className="hero-slot shrink-0 hidden sm:block" data-testid="campaign-crest">
            <EntitySigil
              entityId={activeCampaign?.id ?? ''}
              name={activeCampaign?.name ?? ''}
              size={88}
            />
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            {activeGroup?.name && (
              <Typography
                variant="body-sm"
                className="hero-eyebrow text-[11px] font-semibold uppercase tracking-wider"
              >
                {activeGroup.name}
              </Typography>
            )}

            {/* `break-words` rather than `truncate`: a long campaign name is the
                page's subject, so it wraps instead of being cut off. */}
            <Typography variant="h1" className="text-3xl sm:text-4xl break-words">
              {activeCampaign?.name}
            </Typography>

            {activeCampaign?.description && (
              <Typography className="hero-muted italic font-heading text-base sm:text-lg break-words">
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
                        className="hero-dot w-[3px] h-[3px] rounded-full shrink-0"
                      />
                    )}
                    <Typography variant="body-sm" className="hero-muted">
                      {item}
                    </Typography>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {action && <div className="shrink-0 self-start">{action}</div>}
      </div>
    </div>
  );
};

export default CampaignBanner;
