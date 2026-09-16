// src/pages/privacy/PrivacyDataTable.tsx
import React from "react";
import Typography from "core/components/Typography";
import { PRIVACY_TABLE_ROWS } from "core/constants/privacy";
import { INACTIVITY_TIMEOUT_TEXT, REMEMBER_ME_TEXT } from "core/constants/time";

/** The four columns, in order. Also the per-cell labels in the stacked layout. */
const COLUMNS = ["What we keep", "Why", "Where it goes", "How long"] as const;

/**
 * Expands the SESSION_DURATIONS sentinel that core/constants/privacy leaves in
 * the session row.
 *
 * The durations live in core/constants/time and are shown in several places, so
 * the privacy data must not restate them -- a policy quoting a stale timeout is
 * exactly the class of rot this redesign exists to remove.
 *
 * @param value The raw cell value from PRIVACY_TABLE_ROWS
 */
const expandSentinels = (value: string): string =>
  value.replace(
    "SESSION_DURATIONS",
    `${REMEMBER_ME_TEXT}, or ${INACTIVITY_TIMEOUT_TEXT} idle`
  );

/**
 * The at-a-glance table: what the Companion keeps, why, where it goes and for
 * how long.
 *
 * One semantic `<table>` serves both layouts. From `sm` up it is an ordinary
 * table; below `sm` each row becomes a stacked card and each cell carries its
 * column name in a `data-label` span, because the header row is visually gone
 * at that width. Rendering a second, hidden copy for small screens would
 * duplicate every row for screen-reader users.
 */
const PrivacyDataTable: React.FC = () => (
  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">
        What the Companion keeps about you, why, where it goes and how long it
        stays
      </caption>
      <thead>
        <tr className="hidden sm:table-row border-b card-divider">
          {COLUMNS.map((column) => (
            <th
              key={column}
              scope="col"
              className="py-2 pr-4 align-bottom typography-muted text-xs uppercase tracking-wide font-medium"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PRIVACY_TABLE_ROWS.map((row) => {
          const cells = [row.what, row.why, row.where, row.howLong];

          return (
            <tr
              key={row.id}
              data-testid={`privacy-row-${row.id}`}
              className={[
                "block sm:table-row border-b card-divider",
                "mb-3 sm:mb-0 rounded-lg sm:rounded-none p-3 sm:p-0",
                row.highlighted ? "card-subtle" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cells.map((cell, index) => (
                <td
                  key={COLUMNS[index]}
                  data-label={COLUMNS[index]}
                  className="block sm:table-cell py-1 sm:py-3 pr-0 sm:pr-4 align-top"
                >
                  {/*
                    Deliberately NOT aria-hidden. This span is `sm:hidden`, so
                    from `sm` up it is display:none and never announced anyway --
                    marking it decorative buys nothing there. Below `sm` it is
                    the only column context that exists: the header row is
                    display:none, and overriding `display` on `tr`/`td` drops the
                    table role in several browsers, so header association is gone
                    at that width regardless. Hiding it would leave a
                    narrow-viewport screen-reader user hearing bare values with no
                    idea which column they belong to.
                  */}
                  <span className="sm:hidden block typography-muted text-xs uppercase tracking-wide">
                    {COLUMNS[index]}
                  </span>
                  <Typography
                    variant="body-sm"
                    color={index === 0 ? "default" : "secondary"}
                    className={index === 0 ? "font-medium" : undefined}
                  >
                    {expandSentinels(cell)}
                  </Typography>
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default PrivacyDataTable;
