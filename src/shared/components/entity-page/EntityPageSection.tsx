// src/shared/components/entity-page/EntityPageSection.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';
import FieldLabel from './FieldLabel';

export interface EntityPageSectionProps {
  /**
   * What is under it, named. The application's voice, so sans and uppercase
   * (design language §4) -- "What this place is", never "Basic Information",
   * which is retired outright because every field on a form is basic
   * information (§10).
   */
  title: string;
  /** A quiet count beside the heading, when the section holds a list. */
  count?: number;
  /** The section's one action, at the end of the heading row. */
  action?: React.ReactNode;
  /**
   * Rendered when the section holds nothing.
   *
   * A **question**, not a label: "+ Add the first note", not an empty box under
   * the word "Notes" (§10, design language §8 and §12.7). A location nobody has
   * written up yet must look new rather than broken.
   */
  empty?: React.ReactNode;
  /** The section's contents, or nothing -- in which case `empty` renders. */
  children?: React.ReactNode;
  /**
   * Recessed rather than raised: a card in the sidebar. Its title takes the
   * page's ink rather than the muted label, so that a card heading and the
   * group headings inside it are not the same thing at the same weight.
   */
  muted?: boolean;
  className?: string;
}

/** Is there anything here to show? `false` and `0` are contents; `null` is not. */
const isEmpty = (children: React.ReactNode): boolean =>
  children === null ||
  children === undefined ||
  children === false ||
  (Array.isArray(children) && children.filter(Boolean).length === 0);

/**
 * One card on an entity page: raised in the main column, recessed in the
 * sidebar -- the two cards the NPC page drew for itself before T063 made them
 * every entity page's.
 *
 * It exists mostly to make the empty state impossible to get wrong:
 * every section on every entity page renders its prompt from the same place, so
 * a new section cannot accidentally ship an empty box.
 */
export const EntityPageSection: React.FC<EntityPageSectionProps> = ({
  title,
  count,
  action,
  empty,
  children,
  muted = false,
  className,
}) => (
  <section
    className={clsx(
      'rounded-lg flex flex-col gap-3',
      muted ? 'bg-secondary card-border p-5' : 'card p-6',
      className
    )}
  >
    <div className="flex items-center gap-2 flex-wrap">
      {muted ? (
        <Typography
          variant="body-sm"
          className="text-[11px] font-semibold uppercase tracking-wider"
        >
          {title}
        </Typography>
      ) : (
        <FieldLabel>{title}</FieldLabel>
      )}
      {typeof count === 'number' && (
        <Typography variant="body-sm" color="muted" className="text-xs tabular-nums">
          {count}
        </Typography>
      )}
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </div>

    {isEmpty(children) ? empty ?? null : children}
  </section>
);

export default EntityPageSection;
