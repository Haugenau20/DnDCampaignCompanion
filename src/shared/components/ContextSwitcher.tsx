// components/shared/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGroups, useCampaigns, JoinGroupDialog } from 'features/user-management';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import type { Campaign } from 'core/types/user';
import UndoToast from 'shared/components/context-switcher/UndoToast';
import {
  ChevronDown,
  Settings,
  Users,
  BookOpen,
  PlusCircle,
  Check
} from 'lucide-react';
import clsx from 'clsx';

interface ContextSwitcherProps {
  inDialog?: boolean;
  onClose?: () => void;
}

/**
 * ContextSwitcher is a component that allows users to switch between groups and campaigns.
 * It supports two modes:
 * 1. Header mode: Shows as a dropdown in the header
 * 2. Dialog mode: Shows as an expanded list in a dialog
 *
 * Selecting a group or campaign switches to it immediately -- there is no
 * staged selection and no Apply step. A mis-click is recovered through the
 * undo toast rather than a pre-commit confirmation.
 */
const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  inDialog = false,
  onClose
}) => {
  const { activeGroupId, setActiveGroup, groups } = useGroups();
  const { activeCampaignId, setActiveCampaign, campaigns } = useCampaigns();

  // Still initialised from `inDialog`, which Task 5 removes. Until then the
  // Header dialog is the one caller that passes it, and it must keep opening
  // to the lists rather than to a trigger button inside a modal.
  const [isOpen, setIsOpen] = useState(inDialog);
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

  // Close dropdown when clicking outside (only in header mode)
  useEffect(() => {
    if (inDialog) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (!inDialog) setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inDialog]);

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
      // Dialog mode renders no ContextButton to reopen the lists with, so
      // closing here would strand the user with an empty dialog and a
      // toast. Task 5 deletes `inDialog` and this guard along with it.
      if (!inDialog) setIsOpen(false);
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
      if (!inDialog) setIsOpen(false);
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name ?? 'that group';
    void applySwitch(name, () => setActiveGroup(groupId));
  };

  const handleSelectCampaign = (campaignId: string) => {
    if (campaignId === activeCampaignId) {
      if (!inDialog) setIsOpen(false);
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
      <div className="relative w-full" ref={dropdownRef}>
        {/* Header button - only shown in header mode */}
        {!inDialog && (
          <ContextButton
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        )}

        {/* Dropdown or expanded content */}
        {isOpen && (
          <div className={clsx(
            inDialog ? "" : "absolute left-0 top-full mt-1 w-full rounded-md shadow-lg z-20",
            !inDialog && `dropdown`
          )}>
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
          <div className="absolute left-0 top-full mt-1 w-full z-20 px-3 py-2 dropdown">
            <Typography variant="body-sm" color="error">
              {switchError}
            </Typography>
          </div>
        )}

        {undoTarget && (
          <div className="absolute left-0 top-full mt-2 w-full z-20">
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
 * Button shown in the header to toggle the context switcher
 */
const ContextButton: React.FC<{
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}> = ({ isOpen, setIsOpen }) => {
  const { activeGroup } = useGroups();
  const { activeCampaign } = useCampaigns();
  const { loading } = useGroups();

  // Generate the display text based on selected context
  const contextText = useMemo(() => {
    if (loading) return 'Loading...';

    if (!activeGroup) return 'Select Group';
    if (!activeCampaign) return `${truncateText(activeGroup.name, 15)} / No Campaign`;
    return `${truncateText(activeGroup.name, 15)} / ${truncateText(activeCampaign.name, 15)}`;
  }, [activeGroup, activeCampaign, loading]);

  return (
    <Button
      variant="ghost"
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2"
      endIcon={<ChevronDown className="w-4 h-4 flex-shrink-0" />}
      startIcon={<Settings className="w-5 h-5 flex-shrink-0" />}
      disabled={loading}
    >
      <Typography variant="body" color="primary">
        {contextText}
      </Typography>
    </Button>
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

/**
 * Helper function to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  return text?.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

export default ContextSwitcher;
