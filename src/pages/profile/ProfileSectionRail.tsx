// src/pages/profile/ProfileSectionRail.tsx
import React, { useEffect, useState } from "react";
import clsx from "clsx";

/**
 * One entry in the profile page's section rail.
 */
export interface ProfileSection {
  /** The id of the section element this entry links to (`#id`). */
  id: string;
  /** Visible label. For the group-scoped entry this is the group's own name. */
  label: string;
  /** Renders the entry in the error tone. Used for the danger-zone entry, which also gets a rule drawn before it. */
  tone?: "error";
}

interface ProfileSectionRailProps {
  /** The sections to link to, in display order. The page decides which ones exist for the current state. */
  sections: ProfileSection[];
}

/**
 * Sticky in-page navigation for `/profile`.
 *
 * Renders as a `nav` of anchors (not buttons) so a section stays directly
 * linkable, e.g. `/profile#characters`. Tracks the visible section with an
 * `IntersectionObserver` over elements matching each section's `id`,
 * defaulting to the first section until the observer first fires.
 * `IntersectionObserver` does not exist in jsdom, so this feature-detects it
 * and simply keeps the default when it is missing rather than throwing.
 *
 * Hidden entirely below the `md` breakpoint: on a single column the rail is
 * a shortcut to content the reader can already scroll to, and a horizontal
 * tab strip above that content would cost more than it saves.
 */
const ProfileSectionRail: React.FC<ProfileSectionRailProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  // Reset to the first section whenever the section list itself changes
  // (e.g. the group-scoped entries appear once a group becomes active).
  useEffect(() => {
    setActiveId(sections[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map((section) => section.id).join("|")]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map((section) => section.id).join("|")]);

  const firstErrorIndex = sections.findIndex((section) => section.tone === "error");

  return (
    <nav aria-label="Profile sections" className="hidden md:block sticky top-4 space-y-1">
      {sections.map((section, index) => {
        const isActive = section.id === activeId;
        const isError = section.tone === "error";

        return (
          <React.Fragment key={section.id}>
            {index === firstErrorIndex && <hr className="card-divider border-t my-2" />}
            <a
              href={`#${section.id}`}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "navigation-item-active"
                  : isError
                  ? "typography-error hover:bg-secondary"
                  : "navigation-item"
              )}
            >
              {section.label}
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default ProfileSectionRail;
