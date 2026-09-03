// src/shared/components/context-switcher/ContextTrigger.tsx
import React, { forwardRef, useMemo } from "react";
import { useGroups, useCampaigns } from "features/user-management";
import Typography from "core/components/Typography";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

/**
 * Props for {@link ContextTrigger}.
 */
interface ContextTriggerProps {
  /** Whether the popover it controls is open. */
  isOpen: boolean;
  /** Toggle the popover. */
  onToggle: () => void;
  /** Disabled while the group list is still loading. */
  disabled?: boolean;
}

/**
 * The header chip that opens the context switcher.
 *
 * It names the active CAMPAIGN rather than "group / campaign", because the
 * campaign is what the rest of the page is about and the group changes rarely.
 * The chip is the popover's anchor as well as its trigger -- the switcher
 * appears under the words it is about to change, instead of over a dashboard
 * that is about to change underneath it.
 */
const ContextTrigger = forwardRef<HTMLButtonElement, ContextTriggerProps>(
  ({ isOpen, onToggle, disabled = false }, ref) => {
    const { activeGroup, loading } = useGroups();
    const { activeCampaign } = useCampaigns();

    const label = useMemo(() => {
      if (loading) return "Loading...";
      if (!activeGroup) return "Select Group";
      if (!activeCampaign) return "No Campaign";
      return activeCampaign.name;
    }, [activeGroup, activeCampaign, loading]);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        disabled={disabled || loading}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Active campaign: ${label}. Change group or campaign`}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md min-w-0 max-w-[9rem] md:max-w-[14rem]",
          isOpen ? "dropdown-item-active" : "button-ghost"
        )}
      >
        <Typography variant="body-sm" className="truncate font-semibold">
          {label}
        </Typography>
        <ChevronDown size={14} className="flex-shrink-0" />
      </button>
    );
  }
);

ContextTrigger.displayName = "ContextTrigger";

export default ContextTrigger;
