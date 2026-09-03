// src/pages/privacy/PrivacySectionNav.tsx
import React from "react";
import Typography from "core/components/Typography";
import { PRIVACY_SECTIONS } from "core/constants/privacy";

interface PrivacySectionNavProps {
  /** Section id to mark as current, if the page tracks one. */
  activeId?: string;
}

/**
 * The anchor list beside the full policy text.
 *
 * Generated from PRIVACY_SECTIONS, so a section can never exist without a link
 * to it, nor a link without its section. It sticks only from `lg` up: below
 * that the list sits above the prose as an ordinary table of contents, because
 * a sticky column on a narrow screen eats the reading area it is meant to
 * serve.
 */
const PrivacySectionNav: React.FC<PrivacySectionNavProps> = ({ activeId }) => (
  <nav
    aria-label="The full text"
    className="lg:sticky lg:top-24 lg:self-start mb-6 lg:mb-0"
  >
    <Typography
      variant="body-sm"
      color="muted"
      className="uppercase tracking-wide text-xs mb-2"
    >
      The full text
    </Typography>
    <ul className="space-y-1 list-none">
      {PRIVACY_SECTIONS.map((section) => {
        const isActive = section.id === activeId;

        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={isActive ? "true" : undefined}
              className={[
                "block rounded px-3 py-1.5 text-sm navigation-item",
                isActive ? "navigation-item-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {section.label}
            </a>
          </li>
        );
      })}
    </ul>
  </nav>
);

export default PrivacySectionNav;
