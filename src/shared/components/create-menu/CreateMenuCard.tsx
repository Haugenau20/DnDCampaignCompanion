// src/shared/components/create-menu/CreateMenuCard.tsx
import React, { forwardRef } from "react";
import Typography from "core/components/Typography";
import type { CreateAction } from "shared/hooks/useCreateActions";

/**
 * Props for {@link CreateMenuCard}.
 */
export interface CreateMenuCardProps {
  /** The full create list, in display order. */
  actions: CreateAction[];
  /** Id of the one action rendered as the promoted accent row. */
  promotedId: string;
  /** True when the promoted row is the section the user is currently on. */
  isOnPromotedSection: boolean;
  /** The campaign new content will be added to, named in the header row. */
  campaignName: string;
  /** The character or username new content will be credited to. */
  creditedName: string;
  /** Run an action. The owner closes the menu; you do not. */
  onSelect: (action: CreateAction) => void;
}

/**
 * The popover card behind the global create button.
 *
 * Purely presentational: no open/close state, no keyboard handling, no data
 * hooks. The owner (`GlobalActionButton`) decides which action is promoted,
 * whether that section is the current one, who the content is credited to,
 * and what happens when a row is picked -- this component only renders that
 * decision and reports clicks back up.
 *
 * The ref is forwarded to the root so the owner can hand it to
 * `usePopoverKeys`, which drives focus and arrow-key movement across the
 * `menuitem` rows rendered here.
 */
const CreateMenuCard = forwardRef<HTMLDivElement, CreateMenuCardProps>(
  (
    {
      actions,
      promotedId,
      isOnPromotedSection,
      campaignName,
      creditedName,
      onSelect,
    },
    ref
  ) => {
    const promotedAction = actions.find((action) => action.id === promotedId);
    const otherActions = actions.filter((action) => action.id !== promotedId);
    const PromotedIcon = promotedAction?.icon;

    return (
      <div
        ref={ref}
        role="menu"
        aria-label="Create"
        className="dropdown w-72 rounded-md shadow-lg overflow-hidden"
      >
        {/* Header -- pure layout wrapper, not itself a menu item */}
        <div
          role="none"
          className="flex items-center justify-between gap-2 px-4 py-3 border-b card-divider"
        >
          <div className="min-w-0">
            <Typography
              variant="caption"
              color="muted"
              className="uppercase tracking-wide truncate"
            >
              Add to {campaignName}
            </Typography>
          </div>
          <Typography variant="caption" color="muted" className="flex-shrink-0">
            &#8984;K
          </Typography>
        </div>

        {/* Promoted row -- the one accent-coloured action */}
        {promotedAction && PromotedIcon && (
          <button
            type="button"
            role="menuitem"
            onClick={() => onSelect(promotedAction)}
            className="flex items-center justify-between gap-3 px-4 py-3 w-full text-left button-primary"
          >
            <span className="flex items-center gap-2 min-w-0">
              <PromotedIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate min-w-0 font-semibold">
                {`New ${promotedAction.entityLabel}`}
              </span>
            </span>
            {isOnPromotedSection && (
              <span className="flex-shrink-0 text-xs opacity-80">
                you&apos;re here
              </span>
            )}
          </button>
        )}

        <hr aria-hidden="true" className="card-divider" />

        {/* The rest of the list, bare nouns with their shortcut letters */}
        <div role="none" className="p-2">
          {otherActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                onClick={() => onSelect(action)}
                className="flex items-center justify-between gap-3 px-2 py-2 w-full text-left rounded-md dropdown-item"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <Typography as="span" className="truncate min-w-0">
                    {action.entityLabel}
                  </Typography>
                </span>
                <Typography
                  as="span"
                  variant="caption"
                  color="muted"
                  className="flex-shrink-0"
                >
                  {action.shortcut}
                </Typography>
              </button>
            );
          })}
        </div>

        <hr aria-hidden="true" className="card-divider" />

        {/* Footer -- pure layout wrapper, not itself a menu item */}
        <div role="none" className="px-4 py-3">
          <Typography variant="body-sm" color="muted" className="truncate">
            Credited to{" "}
            <Typography as="span" color="secondary" className="font-semibold">
              {creditedName}
            </Typography>{" "}
            &middot; esc to close
          </Typography>
        </div>
      </div>
    );
  }
);

CreateMenuCard.displayName = "CreateMenuCard";

export default CreateMenuCard;
