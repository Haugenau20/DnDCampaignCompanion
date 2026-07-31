// src/features/campaign-entities/shared/components/Roster.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

/**
 * Shared roster primitives for the entity directories.
 *
 * NPCs, Quests, Rumors and Locations all present the same shape — a searchable,
 * filterable list grouped by something, where each entry expands in place — so the
 * layout is built once here. Each directory previously repeated a card grid whose
 * `lg:grid-cols-3` sat *inside* each group, meaning a group with one entry burned a
 * full three-column row and the page was mostly whitespace.
 */

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

export interface RosterSegment {
  /** Filter value this band selects. */
  key: string;
  label: string;
  count: number;
  /** Tailwind background utility backed by a theme token, e.g. bg-status-completed. */
  colorClass: string;
}

export interface RosterStatusBarProps {
  total: number;
  /** Reads after the total, e.g. "met so far". */
  totalLabel: string;
  segments: RosterSegment[];
  /** The currently selected segment key, or 'all'. */
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * One proportional bar plus a legend that filters.
 *
 * This replaces four equal stat cards whose numbers were a breakdown of each other
 * — that is one bar, not four cards. The cards also used the same icon four times
 * in four colours and were not clickable, while the control they described sat in a
 * dropdown immediately below. Every band here is labelled with a word as well as a
 * colour, so it survives colour blindness.
 */
export const RosterStatusBar: React.FC<RosterStatusBarProps> = ({
  total,
  totalLabel,
  segments,
  activeKey,
  onSelect,
}) => {
  const present = segments.filter(segment => segment.count > 0);

  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-lg card')}>
      <div className="flex items-baseline gap-2 shrink-0">
        <Typography variant="h4" className="text-2xl typography-heading">
          {total}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          {totalLabel}
        </Typography>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div
          className={clsx('flex h-[7px] rounded-full overflow-hidden', `progress-container`)}
        >
          {present.map(segment => (
            <span
              key={segment.key}
              className={segment.colorClass}
              style={{ width: `${(segment.count / Math.max(total, 1)) * 100}%` }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {segments.map(segment => {
            const isEmpty = segment.count === 0;
            const isActive = activeKey === segment.key;

            return (
              <button
                key={segment.key}
                type="button"
                onClick={() => onSelect(isActive ? 'all' : segment.key)}
                aria-pressed={isActive}
                className={clsx(
                  'flex items-center gap-2 text-sm rounded px-1 -mx-1',
                  isEmpty && 'opacity-50'
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'w-2 h-2 rounded-sm shrink-0',
                    isEmpty ? 'bg-secondary' : segment.colorClass
                  )}
                />
                <Typography
                  variant="body-sm"
                  className={clsx('text-sm', isActive && 'font-semibold underline')}
                >
                  {segment.count} {segment.label}
                </Typography>
              </button>
            );
          })}
          <Typography variant="body-sm" color="muted" className="text-sm">
            — click a band to filter
          </Typography>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

export interface RosterFilterOption {
  value: string;
  label: string;
}

export interface RosterFilterPillsProps {
  options: RosterFilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the group, e.g. "Filter by relationship". */
  label: string;
}

/**
 * Filter options as visible pills. A <select> hides every option but one behind a
 * click, which is the wrong trade when there are only four.
 */
export const RosterFilterPills: React.FC<RosterFilterPillsProps> = ({
  options,
  value,
  onChange,
  label,
}) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
    {options.map(option => {
      const isActive = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={isActive}
          className={clsx(
            'px-3 py-1.5 rounded-md text-sm transition-colors',
            isActive
              ? 'bg-status-general text-status-text font-semibold'
              : 'card typography-secondary selectable-item'
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

export interface RosterGroupProps {
  title: string;
  count: number;
  /** Rendered as a link beside the heading when the group maps to a real record. */
  onOpen?: () => void;
  openLabel?: string;
  /** Marks a placeholder group such as "Location unknown". */
  muted?: boolean;
  children: React.ReactNode;
}

/**
 * A group heading plus its rows.
 *
 * The heading is a real heading. It used to be `<Button variant="ghost">` wrapping
 * `<Typography variant="h3">`, which handed screen readers a control where a
 * landmark belongs and gave no visible hint that the place name was a link. The
 * link is now a separate, labelled affordance.
 */
export const RosterGroup: React.FC<RosterGroupProps> = ({
  title,
  count,
  onOpen,
  openLabel = 'Open location',
  muted = false,
  children,
}) => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center gap-3 flex-wrap">
      <Typography
        variant="h3"
        className={clsx('text-lg', muted && 'typography-secondary')}
      >
        {title}
      </Typography>
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary typography-secondary">
        {count}
      </span>
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-medium typography-primary"
        >
          {openLabel}
        </button>
      )}
      <span aria-hidden="true" className="flex-1 h-px min-w-4 bg-secondary opacity-60" />
    </div>

    <div className={clsx('rounded-lg overflow-hidden card')}>{children}</div>
  </section>
);

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

export interface RosterRowProps {
  /** Grid template for the row's cells, so each directory can size its own columns. */
  gridClassName: string;
  /** The collapsed row's cells, laid out on the grid. */
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  /** Rendered below the row when expanded. */
  expandedContent?: React.ReactNode;
  /** Accessible name for the expand control, e.g. the entry's name. */
  toggleLabel: string;
  /**
   * A control rendered beside the row, OUTSIDE the expand button — a selection
   * checkbox, for instance. It cannot go in `children`, because those render inside
   * the button and nesting interactive elements in a button is invalid HTML and
   * swallows the inner control's clicks.
   */
  leadingControl?: React.ReactNode;
  isFirst?: boolean;
  highlighted?: boolean;
  id?: string;
}

/**
 * One dense row, expanding in place.
 *
 * The collapsed card spent five lines and a button to convey what a single row
 * carries: name, title, status, standing and occupation. With nineteen entries you
 * scrolled past a lot of card to find anybody.
 */
export const RosterRow: React.FC<RosterRowProps> = ({
  gridClassName,
  children,
  expanded = false,
  onToggle,
  expandedContent,
  toggleLabel,
  leadingControl,
  isFirst = false,
  highlighted = false,
  id,
}) => (
  <div
    id={id}
    className={clsx(
      'transition-colors',
      !isFirst && 'border-t border-card',
      highlighted && `highlighted-item`,
      expanded && 'bg-secondary'
    )}
  >
    <div className="flex items-stretch">
      {leadingControl && (
        <div className="flex items-center pl-5 shrink-0">{leadingControl}</div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${toggleLabel}`}
        className={clsx(
          'flex-1 min-w-0 text-left px-5 py-3.5 items-center gap-4 grid selectable-item',
          gridClassName
        )}
      >
        {children}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={clsx(
            'justify-self-end transition-transform typography-secondary',
            expanded && 'rotate-180'
          )}
        />
      </button>
    </div>

    {expanded && expandedContent && (
      <div className="px-5 pb-5 pt-1 border-t border-card">{expandedContent}</div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Field — used inside expanded content
// ---------------------------------------------------------------------------

export interface RosterFieldProps {
  label: string;
  /** Shown in italics when there is no value, rather than hiding the field. */
  emptyText?: string;
  children?: React.ReactNode;
}

/**
 * A labelled field in an expanded row. Empty fields say so instead of vanishing,
 * so the shape of a record is legible even when it is mostly blank.
 */
export const RosterField: React.FC<RosterFieldProps> = ({
  label,
  emptyText = 'Not recorded',
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <Typography
      variant="body-sm"
      color="muted"
      className="text-[11px] font-semibold uppercase tracking-wider"
    >
      {label}
    </Typography>
    {children ?? (
      <Typography variant="body-sm" color="muted" className="italic">
        {emptyText}
      </Typography>
    )}
  </div>
);
