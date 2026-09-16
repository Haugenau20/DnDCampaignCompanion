// src/pages/layouts/dashboard/sections/CampaignBanner.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import { useCampaignInfo } from '../../../layouts/common/hooks/useCampaignInfo';

interface CampaignBannerProps {
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
const CampaignBanner: React.FC<CampaignBannerProps> = ({ chapterCount }) => {
  const { activeGroup, activeCampaign, formattedCreationDate, hasCampaign, hasGroup } =
    useCampaignInfo();

  // Cancels the page container's padding so the band spans the full content
  // width and meets the chrome above it, rather than floating as a card.
  // Cancels both the page container's padding and `main`'s, so the band meets
  // the chrome with no seam of page colour between them. Measured, not guessed:
  // main contributes 16px and the container 8px (16px at sm).
  // The band bleeds to the viewport (see `.hero-band`); only the vertical
  // cancel is Tailwind's job.
  // `-mt-4` cancels `main`'s own 16px padding and nothing else: the band now
  // renders above the page column, so the column's `py-4` is no longer above it.
  // The column's top padding supplies half the gap beneath, hence `mb-4`.
  // `-m*-4` cancels `main`'s 16px padding on three sides -- exact, and immune
  // to the scrollbar in a way `50vw` is not. The band renders above the page
  // column now, so nothing else insets it.
  const bandFrame = '-mx-4 -mt-4 mb-4 py-8 sm:py-10 hero-band';

  // Re-creates `main` > `max-w-7xl` > `container` so the band's content sits in
  // exactly the same column as the page content below it. Mirroring the chain
  // is exact by construction; computing the inset from viewport arithmetic is
  // not, because percentages resolve against the containing block.
  const bandInner = 'px-4';
  const bandColumn = 'max-w-7xl mx-auto';
  const bandGutter = 'container mx-auto px-2 sm:px-4';

  if (!hasGroup || !hasCampaign) {
    return (
      <div className={bandFrame} data-testid="campaign-banner">
       <div className={bandInner}><div className={bandColumn}><div className={clsx(bandGutter, 'text-center')}>
        <Typography variant="h2" className="mb-2">
          Welcome to D&D Campaign Companion
        </Typography>
        <Typography color="secondary">
          {!hasGroup
            ? 'Select or create a group to get started'
            : 'Select or create a campaign to begin your adventure'}
        </Typography>
       </div></div></div>
      </div>
    );
  }

  const meta = [
    formattedCreationDate ? `Started ${formattedCreationDate}` : null,
    chapterCount ? `Chapter ${chapterCount}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={bandFrame} data-testid="campaign-banner">
     <div className={bandInner}><div className={bandColumn}><div className={bandGutter}>
      {/* Stacked until `sm`. Side by side, the `shrink-0` toggle claims ~180px of
          a 320px viewport and squeezes the title column to almost nothing, at
          which point `break-words` sets the campaign name one character per
          line. The toggle drops below the identity block instead. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
        <div className="flex items-start gap-4 sm:gap-6 min-w-0">
          {/* No crest here. A large monogram beside the campaign name repeated
              the first letter of the title next to the title, which is the
              redundant encoding the design language warns about -- and it made
              the band's left edge shout before the name did. The party's own
              crest lives in the aside, where it identifies the group rather
              than restating the heading. */}
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

      </div>
     </div></div></div>
    </div>
  );
};

export default CampaignBanner;
