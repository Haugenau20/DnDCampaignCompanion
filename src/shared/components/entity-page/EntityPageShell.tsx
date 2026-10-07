// src/shared/components/entity-page/EntityPageShell.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import EntitySigil from 'core/components/EntitySigil';
import ImageSlot from 'core/components/ImageSlot';
import Breadcrumb from 'shared/components/Breadcrumb';
import ImageUploadControl, { ImageUploadControlProps } from 'shared/components/ImageUploadControl';
import { bandPicture } from 'shared/components/BandPicture';
import { StoredImage } from 'core/types/storedImage';

export interface EntityPageBreadcrumbItem {
  label: string;
  href?: string;
}

export interface EntityPageShellProps {
  /** The trail above the card. The record's own name is the last item. */
  breadcrumb: EntityPageBreadcrumbItem[];
  /** The record's document id, which is what makes its mark stable. */
  entityId: string;
  /** The record's name, in the campaign's voice. */
  name: string;
  /**
   * The name as the page draws it, when that is more than a heading -- the
   * click-to-edit button, or the editor that replaces it. It must contain the
   * page's one `h1`. Defaults to the name as a plain `h1`.
   */
  heading?: React.ReactNode;
  /** One line under the name: what the record is, in a few words. */
  subtitle?: React.ReactNode;
  /** The card's actions, at the end of the name row. */
  actions?: React.ReactNode;
  /**
   * The standing facts, each a cell, laid out under a rule in a fixed grid so
   * two records can be compared by looking at the same place twice.
   */
  facts?: React.ReactNode;
  /** Something the reader must see before anything else, such as a deletion that stopped partway. */
  notice?: React.ReactNode;
  /** Prose and structure. The left column, and the first on a phone. */
  children: React.ReactNode;
  /** Relations and record. The right column, and the second on a phone. */
  aside?: React.ReactNode;
  /** The record's picture. Without one the sigil stands in, and no empty frame is drawn. */
  image?: StoredImage | null;
  /** Alt text for `image`. */
  imageAlt?: string;
  /**
   * The picture's shape. People are tall and places are wide: a "tall"
   * picture stands beside the name, a "wide" one spans the page above the
   * card and the sidebar, light and with nothing written on it.
   */
  imageShape?: 'wide' | 'tall';
  /**
   * Add/replace/remove for `image`, for whoever may edit; omitted for everyone
   * else. Laid over the picture's corner, or over the sigil's while there is
   * none -- so a record without a picture still has somewhere to add one.
   */
  imageUpload?: Pick<ImageUploadControlProps, 'subject' | 'onUpload' | 'onRemove'>;
  className?: string;
}

/**
 * The page every entity shares: a trail, an identity card, and a body of
 * cards beside a sidebar.
 *
 * Built from the NPC page's card (T063), which is what the location and quest
 * pages moved toward: the content differs -- a person, a place, a quest -- and
 * the frame is the same one. The name, its line, the actions and the standing
 * facts sit in one light card; there is one image slot, in one of two shapes.
 *
 * The body collapses to one column in DOM order, so a phone reads the card and
 * the prose first and relations second. That order is the point: on a phone
 * the sidebar would otherwise sit between the name and the description.
 */
export const EntityPageShell: React.FC<EntityPageShellProps> = ({
  breadcrumb,
  entityId,
  name,
  heading,
  subtitle,
  actions,
  facts,
  notice,
  children,
  aside,
  image,
  imageAlt,
  imageShape = 'wide',
  imageUpload,
  className,
}) => {
  const picture = bandPicture(image);
  const wide = picture && imageShape === 'wide';
  const tall = picture && imageShape === 'tall';

  /** The picture in its frame, with its controls laid over it for an editor. */
  const framed = (slot: React.ReactNode, frameClass: string) =>
    imageUpload ? (
      <ImageUploadControl variant="compact" className={frameClass} hasImage {...imageUpload}>
        {slot}
      </ImageUploadControl>
    ) : (
      <div className={frameClass}>{slot}</div>
    );

  const sigil = <EntitySigil entityId={entityId} name={name} size={56} />;

  return (
    <div className={clsx('max-w-7xl mx-auto px-4 py-8', className)}>
      <Breadcrumb items={breadcrumb} className="mb-6" />

      {wide &&
        framed(
          <div data-testid="entity-page-image">
            <ImageSlot
              className="picture-frame aspect-[16/9] sm:aspect-[3/1]"
              label={`${name} — no image added`}
              image={picture}
              alt={imageAlt ?? ''}
              loading="eager"
            />
          </div>,
          'mb-6'
        )}

      <div
        className={clsx(
          'grid gap-6 items-start',
          aside ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'
        )}
      >
        <div className="flex flex-col gap-6 min-w-0">
          {/* ---- Identity: the name, its line, its actions, its facts ---- */}
          <section className="card rounded-lg p-6 flex flex-col sm:flex-row sm:items-start gap-6">
            {tall &&
              framed(
                <div data-testid="entity-page-image">
                  <ImageSlot
                    className="portrait-frame aspect-[3/4]"
                    label={`${name} — no image added`}
                    image={picture}
                    alt={imageAlt ?? ''}
                    loading="eager"
                  />
                </div>,
                'w-40 sm:w-44 shrink-0 self-center sm:self-start'
              )}

            <div className="flex-1 min-w-0 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* On a phone the sigil stands above the name: beside it, a
                    long word in a heading-sized name ran out of room and
                    broke mid-word. The name hyphenates where it must. */}
                <div className="flex flex-col items-start sm:flex-row sm:items-center gap-4 min-w-0 [&_h1]:hyphens-auto">
                  {!picture &&
                    (imageUpload ? (
                      <ImageUploadControl
                        variant="compact"
                        placement="outside"
                        className="shrink-0"
                        hasImage={false}
                        {...imageUpload}
                      >
                        {sigil}
                      </ImageUploadControl>
                    ) : (
                      <div className="shrink-0">{sigil}</div>
                    ))}
                  <div className="min-w-0 flex flex-col gap-1">
                    {/* The name is the campaign's voice and takes the serif,
                        which `Typography`'s heading variants carry. */}
                    {heading ?? (
                      <Typography variant="h1" className="break-words">
                        {name}
                      </Typography>
                    )}
                    {subtitle}
                  </div>
                </div>

                {actions && (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
                )}
              </div>

              {notice}

              {facts && (
                <div
                  className={clsx(
                    'border-t divider pt-5 grid grid-cols-2 gap-4',
                    // Beside a portrait the column is narrower, and four
                    // across would wrap a long value until there is room.
                    tall ? 'xl:grid-cols-4' : 'sm:grid-cols-4'
                  )}
                >
                  {facts}
                </div>
              )}
            </div>
          </section>

          {children}
        </div>

        {aside && <div className="flex flex-col gap-6 min-w-0">{aside}</div>}
      </div>
    </div>
  );
};

export default EntityPageShell;
