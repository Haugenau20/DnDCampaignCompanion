// src/shared/components/command-palette/SearchTrigger.tsx
import React, { forwardRef } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import Typography from "core/components/Typography";

/** Props for {@link SearchTrigger}. */
interface SearchTriggerProps {
  /** Open the command palette. */
  onOpen: () => void;
}

/** True on Apple platforms, where the shortcut hint reads ⌘K rather than Ctrl K. */
const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");

/**
 * The header's search affordance: a fixed-width button, never a field.
 *
 * A field has to be wide to be usable and narrow to fit, and it lost that
 * argument to seven nav items and two chips. A trigger is ~120px always, which
 * frees the surface that actually shows results to be 720px.
 *
 * Below `md` it collapses to an icon-only button so a phone header still has a
 * way into the palette.
 */
const SearchTrigger = forwardRef<HTMLButtonElement, SearchTriggerProps>(
  ({ onOpen }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label="Search"
      aria-keyshortcuts="Meta+K Control+K"
      className={clsx(
        "shrink-0 flex items-center gap-2 rounded-md button-ghost",
        "px-2 py-1.5 md:px-2.5 md:w-[7.5rem]"
      )}
    >
      <Search size={16} className="flex-shrink-0" />
      <Typography variant="body-sm" className="hidden md:inline">
        Search
      </Typography>
      <span
        aria-hidden="true"
        className="hidden md:inline ml-auto px-1.5 py-0.5 rounded text-xs search"
      >
        {isApplePlatform() ? "⌘K" : "Ctrl K"}
      </span>
    </button>
  )
);

SearchTrigger.displayName = "SearchTrigger";

export default SearchTrigger;
