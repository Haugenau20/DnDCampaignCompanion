// src/shared/components/entity-page/EntityPageSection.tsx
import React from 'react';
import clsx from 'clsx';
import Typography from 'core/components/Typography';

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
  /** Recessed rather than raised, for the record card at the foot of the aside. */
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
 * One card on an entity page.
 *
 * Built in `15-4` alongside `EntityPageShell` and consumed unchanged by `15-5`
 * and `15-6`. It exists mostly to make the empty state impossible to get wrong:
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
      'rounded-lg p-5 flex flex-col gap-3',
      muted ? 'bg-secondary card-border' : 'card',
      className
    )}
  >
    <div className="flex items-center gap-2 flex-wrap">
      <Typography
        variant="body-sm"
        className="text-[11px] font-semibold uppercase tracking-wider"
      >
        {title}
      </Typography>
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
