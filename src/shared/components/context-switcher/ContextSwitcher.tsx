// shared/components/context-switcher/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGroups, useCampaigns } from 'features/user-management';
import Typography from 'core/components/Typography';
import UndoToast from './UndoToast';
import ContextTrigger from './ContextTrigger';
import CampaignStep from './CampaignStep';
import GroupStep from './GroupStep';
import { usePopoverKeys } from 'shared/hooks/usePopoverKeys';

/**
 * Props for {@link ContextSwitcher}.
 */
interface ContextSwitcherProps {
  /**
   * Open the join-a-group dialog.
   *
   * The dialog is mounted by the owner rather than here, because the header
   * menu offers the same action -- and mounting it in both places gave the
   * same action two different outcomes depending on which door the user came
   * through.
   */
  onJoinGroup: () => void;
}

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
const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ onJoinGroup }) => {
  const { activeGroupId, setActiveGroup, groups } = useGroups();
  const { activeCampaignId, setActiveCampaign, campaigns } = useCampaigns();

  const [isOpen, setIsOpen] = useState(false);
  /**
   * Which step the popover shows. Campaigns lead; the group step is only
   * reached behind `Change` on the campaign step.
   */
  const [step, setStep] = useState<'campaigns' | 'groups'>('campaigns');
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
  // reopens mid-flow on the group step the user left it on. The switch error
  // is cleared the same way: it renders inside this popover (see below), so
  // once the popover is gone there is nothing left for it to sit under, and
  // it must not resurface stale the next time the popover opens.
  useEffect(() => {
    if (!isOpen) {
      setStep('campaigns');
      setSwitchError(null);
    }
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

  /**
   * Restore the group and campaign that were active before the last switch.
   *
   * When the switch being undone changed the group, restoring the campaign
   * too would run against THIS closure's `setActiveCampaign`, which is bound
   * to a `switchCampaign` whose captured `activeGroupId` is still the group
   * being undone away from -- so it would write the old group's campaign id
   * onto the group undo is restoring, the exact cross-group pairing this
   * switcher exists to prevent. It is also unnecessary: `setActiveGroup`
   * goes through `setActiveGroupContext`, which already loads the restored
   * group's campaigns and re-activates that group's own stored
   * `activeCampaignId`. So a group undo restores the campaign only as a
   * side effect of restoring the group; the campaign branch below runs only
   * when undo is not also changing the group.
   */
  const handleUndo = async () => {
    if (!undoTarget) return;
    const { groupId, campaignId } = undoTarget;
    setUndoError(null);

    try {
      const groupChanged = groupId !== null && groupId !== activeGroupId;
      if (groupChanged) {
        await setActiveGroup(groupId);
      } else if (campaignId && campaignId !== activeCampaignId) {
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
    // `flex` is load-bearing, not cosmetic: `min-w-0` lets this wrapper shrink
    // as a flex item of the header row, but while it stayed a block the trigger
    // inside it was sized shrink-to-fit up to its own `max-w-[14rem]` and simply
    // overflowed the shrunken wrapper, painting over the first nav item. Making
    // this a flex container makes the trigger a flex item, so its own `min-w-0`
    // applies and its label's `truncate` finally does the work.
    <div className="relative min-w-0 flex" ref={dropdownRef}>
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
              onJoinGroup={onJoinGroup}
            />
          ) : (
            <GroupStep
              onSelectGroup={handleSelectGroup}
              onBack={() => setStep('campaigns')}
            />
          )}

          {/* A failed switch is reported inside the popover it happened in,
              not as a same-position sibling overlay -- the previous overlay
              painted over the still-open popover (a failed switch never
              closes it) and had no owner to clear it on Escape or
              click-outside, so it hung under the header until the next
              switch attempt. */}
          {switchError && (
            <div role="none" className="px-4 py-2 border-t card-divider">
              <Typography variant="body-sm" color="error">
                {switchError}
              </Typography>
            </div>
          )}
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
  );
};

export default ContextSwitcher;
