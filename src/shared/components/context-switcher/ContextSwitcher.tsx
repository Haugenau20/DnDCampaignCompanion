// shared/components/context-switcher/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGroups, useCampaigns, JoinGroupDialog } from 'features/user-management';
import Typography from 'core/components/Typography';
import UndoToast from './UndoToast';
import ContextTrigger from './ContextTrigger';
import CampaignStep from './CampaignStep';
import GroupStep from './GroupStep';
import { usePopoverKeys } from './usePopoverKeys';

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
  /**
   * Which step the popover shows. Campaigns lead; the group step is only
   * reached behind `Change` on the campaign step.
   */
  const [step, setStep] = useState<'campaigns' | 'groups'>('campaigns');
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

  // Reset to the campaign step whenever the popover closes, so it never
  // reopens mid-flow on the group step the user left it on.
  useEffect(() => {
    if (!isOpen) setStep('campaigns');
  }, [isOpen]);

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

  /**
   * Choose a group from the group step.
   *
   * Because `setActiveGroup` loads that group's campaigns and activates the
   * one the user last had open there (Task 2), the campaign step is correct
   * by construction when it reappears -- this is the structural cure for the
   * bug fixed in 592b548, where a stale, locally cached campaign list could
   * pair a new group with the previous group's campaign.
   */
  const handleSelectGroup = (groupId: string) => {
    if (groupId === activeGroupId) {
      setStep('campaigns');
      return;
    }
    const name = groups.find((g) => g.id === groupId)?.name ?? 'that group';
    void applySwitch(name, async () => {
      await setActiveGroup(groupId);
      setStep('campaigns');
    });
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
            {step === 'campaigns' ? (
              <CampaignStep
                onSelectCampaign={handleSelectCampaign}
                onChangeGroup={() => setStep('groups')}
                onJoinGroup={() => setShowJoinGroupDialog(true)}
              />
            ) : (
              <GroupStep
                onSelectGroup={handleSelectGroup}
                onBack={() => setStep('campaigns')}
              />
            )}
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

export default ContextSwitcher;
