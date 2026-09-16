// src/core/components/ImageSlot.tsx
import React from 'react';
import clsx from 'clsx';

export interface ImageSlotProps {
  /**
   * What a screen reader is told. Must state the *state* honestly -- that no
   * image has been added -- rather than describing an image that is not there.
   */
  label: string;
  /** A quiet line inside the band, for slots large enough to carry one. */
  caption?: string;
  className?: string;
}

/**
 * The reserved space where an entity's image would go.
 *
 * No bitmaps ship (D6), so **the empty state is the whole component**. Most
 * slots will be empty for most entities for the life of a campaign, which makes
 * "empty" the state that has to look deliberate; a slot that only looks right
 * once someone uploads something is a slot that looks wrong almost always.
 *
 * Diagonal ruling in the page's own sunken tone reads as reserved space with a
 * design. A stock illustration would read as a wrong picture, and an upload
 * affordance would promise something this build cannot do -- there is no
 * Storage, no picker, and no generation behind it.
 *
 * Generalised from `PartyCrest`, which had the only instance until the NPC page
 * became the second. Two uses is the threshold; one was not.
 */
export const ImageSlot: React.FC<ImageSlotProps> = ({
  label,
  caption,
  className,
}) => (
  <div
    className={clsx(
      'image-slot flex items-center justify-center px-4 text-center',
      className
    )}
    role="img"
    aria-label={label}
    data-testid="image-slot"
  >
    {caption && (
      // Hidden from the accessibility tree: `role="img"` already gives this
      // element its whole accessible name, so the caption would either be
      // ignored or read twice.
      <span aria-hidden="true" className="image-slot-caption text-xs">
        {caption}
      </span>
    )}
  </div>
);

export default ImageSlot;
