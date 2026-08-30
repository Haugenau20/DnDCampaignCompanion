// components/shared/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGroups, useCampaigns, JoinGroupDialog } from 'features/user-management';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import type { Campaign } from 'core/types/user';
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
 */
const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ 
  inDialog = false,
  onClose 
}) => {
  const { activeGroupId, setActiveGroup } = useGroups();
  const {
    activeCampaignId,
    setActiveCampaign,
    campaigns: activeGroupCampaigns,
    getCampaigns,
  } = useCampaigns();

  // Local state for selections (pure UI state, no backend calls)
  const [isOpen, setIsOpen] = useState(inDialog); // Always open in dialog mode
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(activeGroupId);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(activeCampaignId);
  const [applyError, setApplyError] = useState<string | null>(null);
  /**
   * Campaigns belonging to a group the user has selected but not yet applied.
   * `null` while the active group is the selected one, because the context
   * already holds that group's list.
   */
  const [otherGroupCampaigns, setOtherGroupCampaigns] = useState<Campaign[] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update local selections when active IDs change (initial load)
  useEffect(() => {
    setSelectedGroupId(activeGroupId);
  }, [activeGroupId]);

  const isSelectedGroupActive = selectedGroupId === activeGroupId;

  /**
   * Keep the campaign list and the campaign selection tied to the SELECTED
   * group rather than the active one.
   *
   * `useCampaigns().campaigns` is populated by FirebaseContext for the ACTIVE
   * group, so selecting a different group used to leave the active group's
   * campaigns on screen -- and applying then wrote a group and a campaign that
   * did not belong together. Selecting another group now loads that group's
   * campaigns and moves the selection onto one of them, so a stale id can
   * never survive the change.
   */
  useEffect(() => {
    if (!selectedGroupId || isSelectedGroupActive) {
      setOtherGroupCampaigns(null);
      setSelectedCampaignId(activeCampaignId);
      return;
    }

    let cancelled = false;
    getCampaigns(selectedGroupId).then((list) => {
      if (cancelled) return;
      setOtherGroupCampaigns(list);
      setSelectedCampaignId(list[0]?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, isSelectedGroupActive, activeCampaignId, getCampaigns]);

  const visibleCampaigns = isSelectedGroupActive
    ? activeGroupCampaigns
    : otherGroupCampaigns ?? [];

  // Determine if there are changes to apply
  const hasChanges = selectedGroupId !== activeGroupId || selectedCampaignId !== activeCampaignId;
  
  // Close dropdown when clicking outside (only in header mode)
  useEffect(() => {
    if (inDialog) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inDialog]);
  
  /**
   * Apply the staged selection.
   *
   * The group and the campaign are two separate writes, so a failure between
   * them would otherwise leave the app in exactly the broken pairing this
   * component now prevents: the new group active, the old group's campaign
   * still selected. If the campaign write fails, put the group back and say
   * so, rather than reloading into a state nobody asked for.
   */
  const handleApplyChanges = async () => {
    setApplyError(null);
    const previousGroupId = activeGroupId;
    let groupChanged = false;

    try {
      if (selectedGroupId && selectedGroupId !== activeGroupId) {
        await setActiveGroup(selectedGroupId);
        groupChanged = true;
      }

      if (selectedCampaignId && selectedCampaignId !== activeCampaignId) {
        await setActiveCampaign(selectedCampaignId);
      }

      // Reload page to refresh all data and UI
      window.location.reload();
    } catch (error) {
      if (groupChanged && previousGroupId) {
        try {
          await setActiveGroup(previousGroupId);
        } catch (rollbackError) {
          console.error("Could not restore the previous group:", rollbackError);
        }
      }

      setApplyError(
        error instanceof Error
          ? error.message
          : "Could not switch group or campaign."
      );
    }
  };
  
  // Reset selections to current active values
  const handleReset = () => {
    setSelectedGroupId(activeGroupId);
    setSelectedCampaignId(activeCampaignId);
    
    if (onClose) {
      onClose();
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
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              showJoinGroupDialog={() => setShowJoinGroupDialog(true)}
            />
            
            {/* Campaigns Section */}
            <CampaignSelector
              selectedGroupId={selectedGroupId}
              activeCampaignId={activeCampaignId}
              selectedCampaignId={selectedCampaignId}
              campaigns={visibleCampaigns}
              onSelectCampaign={setSelectedCampaignId}
            />

            {/* Action Buttons for Dialog Mode */}
            {inDialog && (
              <>
                {applyError && (
                  <div className="px-3 pt-3">
                    <Typography variant="body-sm" color="error">
                      {applyError}
                    </Typography>
                  </div>
                )}
                <div className="p-3 border-t flex justify-end gap-2">
                  <Button
                    onClick={handleApplyChanges}
                    disabled={!hasChanges}
                  >
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                  >
                    Close Without Applying
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        onSuccess={() => {
          setShowJoinGroupDialog(false);
          // Reload the page immediately when joining a new group
          window.location.reload();
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
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  showJoinGroupDialog: () => void;
}> = ({ 
  activeGroupId, 
  selectedGroupId, 
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
            // Determine the item's state 
            const isActive = group.id === activeGroupId;
            const isSelected = group.id === selectedGroupId;
            
            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={clsx(
                  "flex items-center justify-between px-3 py-2 w-full text-left rounded-md",
                  isSelected ? `dropdown-item-active` : 
                  `dropdown-item`
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
  selectedGroupId: string | null;
  activeCampaignId: string | null;
  selectedCampaignId: string | null;
  campaigns: Campaign[];
  onSelectCampaign: (campaignId: string) => void;
}> = ({
  selectedGroupId,
  activeCampaignId,
  selectedCampaignId,
  campaigns,
  onSelectCampaign
}) => {
  // Only show once a group is selected -- the list belongs to the SELECTED
  // group, so gating on the ACTIVE one was part of the bug.
  if (!selectedGroupId) return null;
  
  return (
    <div className="p-2 border-t">
      <Typography variant="body-sm" color="secondary" className="px-3 py-1">
        Select Campaign
      </Typography>
      
      <div className="mt-1 max-h-48 overflow-y-auto">
        {campaigns.length > 0 ? (
          /* Campaign List */
          campaigns.map(campaign => {
            // Determine the item's state
            const isActive = campaign.id === activeCampaignId;
            const isSelected = campaign.id === selectedCampaignId;
            
            return (
              <button
                key={campaign.id}
                onClick={() => onSelectCampaign(campaign.id)}
                className={clsx(
                  "flex items-center justify-between px-3 py-2 w-full text-left rounded-md",
                  isSelected ? `dropdown-item-active` : 
                  `dropdown-item`
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