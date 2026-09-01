// shared/components/context-switcher/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGroups, useCampaigns, JoinGroupDialog } from 'features/user-management';
import Typography from 'core/components/Typography';
import type { Campaign } from 'core/types/user';
import UndoToast from './UndoToast';
import ContextTrigger from './ContextTrigger';
import { usePopoverKeys } from './usePopoverKeys';
import {
  Users,
  BookOpen,
  PlusCircle,
  Check
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Lets the user see and change the active group and campaign.
 *
 * A popover anchored to the header chip, not a modal. The modal it replaced
 * covered the dashboard it was about to change and repeated its own two
 * section labels in its title.
 *
 * Selecting a group or campaign switches to it immediately -- there is no
 * staged selection and no Apply step. A mis-click is recovered through the
 * undo toast rather than a pre-commit confirmation.
 */
const ContextSwitcher: React.FC = () => {
  const { activeGroupId, setActiveGroup, groups } = useGroups();
  const { activeCampaignId, setActiveCampaign, campaigns } = useCampaigns();

  const [isOpen, setIsOpen] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  /**
   * The group and campaign to go back to, plus what we switched to. Held only
   * while the toast is up.
   */
  const [undoTarget, setUndoTarget] = useState<{
    groupId: string | null;
    campaignId: string | null;
    label: string;
  } | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closePopover = useCallback(() => setIsOpen(false), []);

  usePopoverKeys({ isOpen, panelRef, triggerRef, onClose: closePopover });

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Apply a switch and offer to take it back.
   *
   * Selection used to be staged behind `Apply Changes`, with a
   * `Close Without Applying` beside it -- a Cancel with the state machine
   * written into its label, which existed because users could not otherwise
   * predict whether closing would commit. Applying on click removes the
   * question; the undo covers the mis-click that the confirmation was
   * protecting against, without charging every correct switch for it.
   */
  const applySwitch = async (
    label: string,
    change: () => Promise<void>
  ): Promise<void> => {
    const previous = { groupId: activeGroupId, campaignId: activeCampaignId };
    setSwitchError(null);
    setUndoError(null);

    try {
      await change();
      setIsOpen(false);
      setUndoTarget({ ...previous, label });
    } catch (error) {
      setSwitchError(
        error instanceof Error
          ? error.message
          : 'Could not switch group or campaign.'
      );
    }
  };

  const handleSelectGroup = (groupId: string) => {
    if (groupId === activeGroupId) {
      setIsOpen(false);
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name ?? 'that group';
    void applySwitch(name, () => setActiveGroup(groupId));
  };

  const handleSelectCampaign = (campaignId: string) => {
    if (campaignId === activeCampaignId) {
      setIsOpen(false);
      return;
    }
    const name = campaigns.find((c) => c.id === campaignId)?.name ?? 'that campaign';
    void applySwitch(name, () => setActiveCampaign(campaignId));
  };

  /** Restore the group and campaign that were active before the last switch. */
  const handleUndo = async () => {
    if (!undoTarget) return;
    const { groupId, campaignId } = undoTarget;
    setUndoError(null);

    try {
      if (groupId && groupId !== activeGroupId) {
        await setActiveGroup(groupId);
      }
      if (campaignId && campaignId !== activeCampaignId) {
        await setActiveCampaign(campaignId);
      }
      setUndoTarget(null);
    } catch (error) {
      setUndoError(
        error instanceof Error ? error.message : 'Could not switch back.'
      );
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <ContextTrigger
          ref={triggerRef}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
        />

        {isOpen && (
          <div
            ref={panelRef}
            role="menu"
            aria-label="Group and campaign"
            className="dropdown absolute left-0 top-full mt-1 w-[23.5rem] max-w-[calc(100vw-2rem)] rounded-md shadow-lg z-20"
          >
            {/* Groups Section */}
            <GroupSelector
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              showJoinGroupDialog={() => setShowJoinGroupDialog(true)}
            />

            {/* Campaigns Section */}
            <CampaignSelector
              activeGroupId={activeGroupId}
              activeCampaignId={activeCampaignId}
              campaigns={campaigns}
              onSelectCampaign={handleSelectCampaign}
            />
          </div>
        )}

        {switchError && (
          <div className="absolute left-0 top-full mt-1 w-[23.5rem] max-w-[calc(100vw-2rem)] z-20 px-3 py-2 dropdown">
            <Typography variant="body-sm" color="error">
              {switchError}
            </Typography>
          </div>
        )}

        {undoTarget && (
          <div className="absolute left-0 top-full mt-2 w-[23.5rem] max-w-[calc(100vw-2rem)] z-20">
            <UndoToast
              label={undoTarget.label}
              error={undoError}
              onUndo={handleUndo}
              onDismiss={() => {
                setUndoTarget(null);
                setUndoError(null);
              }}
            />
          </div>
        )}
      </div>

      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        onSuccess={() => {
          setShowJoinGroupDialog(false);
        }}
      />
    </>
  );
};

/**
 * Component for selecting groups
 */
const GroupSelector: React.FC<{
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  showJoinGroupDialog: () => void;
}> = ({
  activeGroupId,
  onSelectGroup,
  showJoinGroupDialog
}) => {
  const { groups, loading: groupsLoading } = useGroups();

  return (
    <div className="p-2">
      <Typography variant="body-sm" color="secondary" className="px-3 py-1">
        Select Group
      </Typography>

      <div className="mt-1 max-h-48 overflow-y-auto">
        {/* Loading State */}
        {groupsLoading ? (
          <LoadingState text="Loading groups..." />
        ) : groups.length > 0 ? (
          /* Group List */
          groups.map(group => {
            // With staged selection gone, "active" and "selected" are one
            // state -- the row carries the tint and the check together.
            const isActive = group.id === activeGroupId;

            return (
              <button
                key={group.id}
                role="menuitem"
                onClick={() => onSelectGroup(group.id)}
                className={clsx(
                  "flex items-center justify-between px-3 py-2 w-full text-left rounded-md",
                  isActive ? `dropdown-item-active` : `dropdown-item`
                )}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <Typography className="truncate">
                    {group.name}
                  </Typography>
                </div>

                {/* Show active indicator */}
                {isActive && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            );
          })
        ) : (
          /* Empty State */
          <div className="px-3 py-2">
            <Typography color="secondary">No groups available</Typography>
          </div>
        )}

        {/* Join Group Option */}
        <button
          role="menuitem"
          onClick={showJoinGroupDialog}
          className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-md dropdown-item"
        >
          <PlusCircle className="w-4 h-4 flex-shrink-0" />
          <Typography>Join Group</Typography>
        </button>
      </div>
    </div>
  );
};

/**
 * Component for selecting campaigns
 */
const CampaignSelector: React.FC<{
  activeGroupId: string | null;
  activeCampaignId: string | null;
  campaigns: Campaign[];
  onSelectCampaign: (campaignId: string) => void;
}> = ({
  activeGroupId,
  activeCampaignId,
  campaigns,
  onSelectCampaign
}) => {
  // Only show once a group is active -- there is no selected-but-not-active
  // group anymore, so this is simply "is there a group at all".
  if (!activeGroupId) return null;

  return (
    <div className="p-2 border-t">
      <Typography variant="body-sm" color="secondary" className="px-3 py-1">
        Select Campaign
      </Typography>

      <div className="mt-1 max-h-48 overflow-y-auto">
        {campaigns.length > 0 ? (
          /* Campaign List */
          campaigns.map(campaign => {
            const isActive = campaign.id === activeCampaignId;

            return (
              <button
                key={campaign.id}
                role="menuitem"
                onClick={() => onSelectCampaign(campaign.id)}
                className={clsx(
                  "flex items-center justify-between px-3 py-2 w-full text-left rounded-md",
                  isActive ? `dropdown-item-active` : `dropdown-item`
                )}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <Typography className="truncate">
                    {campaign.name}
                  </Typography>
                </div>

                {/* Show active indicator */}
                {isActive && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            );
          })
        ) : (
          /* Empty State */
          <div className="px-3 py-2">
            <Typography color="secondary">No campaigns in this group</Typography>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading state component
 */
const LoadingState: React.FC<{ text: string }> = ({ text }) => {

  return (
    <div className="px-3 py-2 flex items-center justify-center">
      <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full mr-2 primary" />
      <Typography variant="body-sm" color="secondary">
        {text}
      </Typography>
    </div>
  );
};

export default ContextSwitcher;
