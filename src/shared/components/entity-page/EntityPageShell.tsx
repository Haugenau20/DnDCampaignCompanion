// src/shared/components/entity-page/EntityPageShell.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import Breadcrumb from 'shared/components/Breadcrumb';
import ImageUploadControl, { ImageUploadControlProps } from 'shared/components/ImageUploadControl';
import { bandPicture } from 'shared/components/BandPicture';
import PicturedBand, { BandRegion } from 'shared/components/PicturedBand';
import { StoredImage } from 'core/types/storedImage';

export interface EntityPageBreadcrumbItem {
  label: string;
  href?: string;
}

export interface EntityPageShellProps {
  /** The trail above the name. The record's own name is the last item. */
  breadcrumb: EntityPageBreadcrumbItem[];
  /** The record's document id, which is what makes its mark stable. */
  entityId: string;
  /** The record's name, in the campaign's voice. */
  name: string;
  /**
   * One line of standing facts under the name -- "City in Beleriand · 2 places
   * inside · last visited 31 May 2025".
   *
   * One line, deliberately. A band that grows a second line of metadata is a
   * band that has started being the record.
   */
  meta?: React.ReactNode;
  /** The state control: a location's knowledge step, a quest's status. */
  bandControl?: React.ReactNode;
  /** Actions on the band. The one primary act, and nothing else. */
  actions?: React.ReactNode;
  /** Prose and structure. The left column, and the first on a phone. */
  children: React.ReactNode;
  /** Relations and record. The right column, and the second on a phone. */
  aside?: React.ReactNode;
  /**
   * The record's picture, drawn across the band behind its text.
   *
   * `PicturedBand` keeps each block of text on it -- the trail, the name,
   * the controls -- readable: a silhouette of the band colour around each
   * glyph, and a faint patch behind the block (design D10). A window at the
   * band's top shows the picture above the text. Without a picture the band
   * is drawn as it always was: most records never get one, and an empty slot
   * on every one of them would be the page's main feature.
   */
  image?: StoredImage | null;
  /** Alt text for `image`. */
  imageAlt?: string;
  /**
   * Add/replace/remove for `image`, for whoever may edit; omitted for everyone
   * else. Laid over the band's top-right corner as a compact
   * `ImageUploadControl` (T068). Its status and error note hangs below the
   * band as a `card`, so none of it is text on the band (T040).
   */
  imageUpload?: Pick<ImageUploadControlProps, 'subject' | 'onUpload' | 'onRemove'>;
  className?: string;
}

/**
 * The header and two-column body every entity page shares.
 *
 * Built in `15-4` and consumed unchanged by `15-5` and `15-6` -- the quest and
 * NPC pages are the same object with different contents, and three pages that
 * each grew their own header is how the four directories ended up reading
 * `?highlight=` four different ways.
 *
 * **The band carries no accent.** `colour-schema.md` §5.2 solves `accent.*`
 * against page, card and sunken and not against the band; light `accent.ink`
 * #8D4F00 on band #26211C measures ~1.9:1. The gap is T040 and an implementing
 * PR may not close it, so everything on the band takes the band's own pair --
 * see `.band-chip` in `components.css`. Nothing here names a colour.
 *
 * The body collapses to one column in DOM order, so a phone reads prose and
 * structure first and relations second. That order is the point: on a phone the
 * sidebar would otherwise sit between the name and the description.
 */
export const EntityPageShell: React.FC<EntityPageShellProps> = ({
  breadcrumb,
  entityId,
  name,
  meta,
  bandControl,
  actions,
  children,
  aside,
  image,
  imageAlt,
  imageUpload,
  className,
}) => {
  const picture = bandPicture(image);

  const band = (
    <PicturedBand
      image={picture}
      alt={imageAlt ?? ''}
      className="hero-band py-6 sm:py-8"
      innerClassName="px-4"
      pictureTestId="entity-page-image"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        {/* Sized to the trail, so its patch covers the words and not the row. */}
        <BandRegion className="self-start max-w-full">
          <Breadcrumb
            items={breadcrumb}
            tone="band"
            // Room for the corner buttons, which sit level with the trail when
            // there is no picture window above it.
            className={clsx('py-0', imageUpload && !picture && 'pr-20')}
          />
        </BandRegion>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <BandRegion className="flex items-start gap-4 min-w-0">
            <EntitySigil entityId={entityId} name={name} size={48} className="shrink-0" />
            <div className="min-w-0 flex flex-col gap-1">
              {/*
                The name is the campaign's voice and takes the serif, which
                `Typography`'s heading variants already carry (design language
                §4). Everything else on this page is the application talking.
              */}
              <Typography variant="h1" className="text-3xl sm:text-4xl break-words">
                {name}
              </Typography>
              {meta && (
                <Typography variant="body-sm" className="hero-muted">
                  {meta}
                </Typography>
              )}
            </div>
          </BandRegion>

          {(bandControl || actions) && (
            <BandRegion className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0 self-start">
              {bandControl}
              {actions}
            </BandRegion>
          )}
        </div>
      </div>
    </PicturedBand>
  );

  return (
    <div className={clsx('px-4 py-4', className)}>
      {/*
        Full bleed, cancelling the container's own padding, so the band meets the
        chrome above it with no seam of page colour between them -- the same
        treatment `CampaignBanner` and `AdminLayout` already use.
      */}
      <div className="-mx-4 -mt-4">
        {imageUpload ? (
          <ImageUploadControl variant="compact" hasImage={Boolean(picture)} {...imageUpload}>
            {band}
          </ImageUploadControl>
        ) : (
          band
        )}
      </div>

      <div
        className={clsx(
          'max-w-7xl mx-auto mt-6 grid gap-6 items-start',
          aside ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem]' : 'grid-cols-1'
        )}
      >
        <div className="flex flex-col gap-6 min-w-0">{children}</div>
        {aside && <div className="flex flex-col gap-6 min-w-0">{aside}</div>}
      </div>
    </div>
  );
};

export default EntityPageShell;
