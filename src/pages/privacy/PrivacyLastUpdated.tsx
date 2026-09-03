// src/pages/privacy/PrivacyLastUpdated.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import { PRIVACY_LAST_UPDATED, PRIVACY_CHANGELOG } from "core/constants/privacy";

/**
 * Formats an ISO date the way a British-English reader expects: day first,
 * month spelled out. Explicitly en-GB, because the page previously passed
 * 'en-uk' -- not a locale tag, so it silently fell back to the browser's own
 * locale and rendered differently for every reader.
 *
 * @param isoDate Date in YYYY-MM-DD form
 */
const formatPolicyDate = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * The policy's revision date, plus a disclosure holding the changelog.
 *
 * The date is machine-readable in a `<time dateTime>` and human-readable in the
 * element's text, and both come from PRIVACY_LAST_UPDATED -- never from the
 * clock. A policy that re-dates itself on every view records nothing.
 */
const PrivacyLastUpdated: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sm:text-right">
      <Typography variant="body-sm" color="secondary">
        Last updated{" "}
        <time dateTime={PRIVACY_LAST_UPDATED} className="font-medium">
          {formatPolicyDate(PRIVACY_LAST_UPDATED)}
        </time>
      </Typography>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="privacy-changelog"
        className="button-link text-sm underline mt-1"
      >
        What changed
      </button>

      {isOpen && (
        <ul
          id="privacy-changelog"
          className="mt-2 space-y-1 sm:text-right list-none"
        >
          {PRIVACY_CHANGELOG.map((entry) => (
            <li key={entry}>
              <Typography variant="body-sm" color="muted">
                {entry}
              </Typography>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PrivacyLastUpdated;
