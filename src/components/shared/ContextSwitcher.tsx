// components/shared/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGroups, useCampaigns } from '../../context/firebase';
import { useTheme } from '../../context/ThemeContext';
import Button from '../core/Button';
import Typography from '../core/Typography';
import { ChevronDown, Settings, BookOpen, Users, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import JoinGroupDialog from '../features/groups/JoinGroupDialog';

interface ContextSwitcherProps {
  inDialog?: boolean;
  onClose?: () => void;
}

/**
 * A component for switching between groups and campaigns
 */
const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ 
  inDialog = false,
  onClose 
}) => {
  const { 
    groups, 
    activeGroupId, 
    setActiveGroup, 
    activeGroupUserProfile, 
    loading: groupsLoading,
    refreshGroups 
  } = useGroups();
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaigns();
  
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [selectionMade, setSelectionMade] = useState(false);
  
  // Check if current user is admin
  const isAdmin = activeGroupUserProfile?.role === 'admin' || false;
  
  // Look up current group and campaign
  const currentGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;
  const currentCampaign = activeCampaignId ? campaigns.find(c => c.id === activeCampaignId) : null;
  
  // Only show dropdown in the header version, not in dialog
  useEffect(() => {
    if (inDialog) {
      setIsOpen(true);
    }
  }, [inDialog]);
  
  // Effect to refresh page after selection is made
  useEffect(() => {
    if (selectionMade) {
      // Refresh the page after a short delay to allow state to update
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectionMade]);
  
  // Close dropdown when clicking outside - only needed in header version
  useEffect(() => {
    if (inDialog) return; // Skip for dialog version
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inDialog]);

  // Helper to truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    return text?.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Generate display text
  const getContextText = useCallback(() => {
    if (groupsLoading) return 'Loading...';
    
    if (!currentGroup) return 'Select Group';
    if (!currentCampaign) return `${truncateText(currentGroup.name, 15)} / No Campaign`;
    return `${truncateText(currentGroup.name, 15)} / ${truncateText(currentCampaign.name, 15)}`;
  }, [currentGroup, currentCampaign, groupsLoading]);

  // Handle group selection
  const handleSelectGroup = async (groupId: string) => {
    setLoadingCampaigns(true);
    
    try {
      await setActiveGroup(groupId);
      if (!inDialog) {
        setIsOpen(false);
      }
      
      // Mark that a selection was made
      setSelectionMade(true);
    } catch (err) {
      console.error('Error changing group in context switcher:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Handle campaign selection
  const handleSelectCampaign = async (campaignId: string) => {
    try {
      await setActiveCampaign(campaignId);
      if (!inDialog) {
        setIsOpen(false);
      }
      if (onClose) {
        onClose();
      }
      
      // Mark that a selection was made
      setSelectionMade(true);
    } catch (err) {
      console.error('Error changing campaign in context switcher:', err);
    }
  };

  // The dropdown content
  const renderDropdownContent = () => (
    <div className={clsx(
      inDialog ? "" : "absolute left-0 top-full mt-1 w-full rounded-md shadow-lg z-20",
      !inDialog && `${themePrefix}-dropdown`
    )}>
      {/* Groups Section */}
      <div className="p-2">
        <Typography variant="body-sm" color="secondary" className="px-3 py-1">
          Select Group
        </Typography>
        
        <div className="mt-1 max-h-48 overflow-y-auto">
          {groupsLoading ? (
            <div className="px-3 py-2 flex items-center justify-center">
              <div className={clsx(
                "animate-spin w-4 h-4 border-2 border-t-transparent rounded-full mr-2",
                `${themePrefix}-primary`
              )} />
              <Typography variant="body-sm" color="secondary">
                Loading groups...
              </Typography>
            </div>
          ) : groups.length > 0 ? (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => handleSelectGroup(group.id)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 w-full text-left rounded-md",
                  group.id === activeGroupId ? 
                    `${themePrefix}-dropdown-item-active` : 
                    `${themePrefix}-dropdown-item`
                )}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <Typography className="truncate">{group.name}</Typography>
              </button>
            ))
          ) : (
            <div className="px-3 py-2">
              <Typography color="secondary">No groups available</Typography>
            </div>
          )}
          
          {/* Join Group Option */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowJoinGroupDialog(true);
            }}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 w-full text-left rounded-md",
              `${themePrefix}-dropdown-item`
            )}
          >
            <PlusCircle className="w-4 h-4 flex-shrink-0" />
            <Typography>Join or Create Group</Typography>
          </button>
        </div>
      </div>
      
      {/* Campaigns Section - Only show if a group is selected */}
      {activeGroupId && (
        <div className="p-2 border-t">
          <Typography variant="body-sm" color="secondary" className="px-3 py-1">
            Select Campaign
          </Typography>
          
          <div className="mt-1 max-h-48 overflow-y-auto">
            {loadingCampaigns ? (
              <div className="px-3 py-2 flex items-center justify-center">
                <div className={clsx(
                  "animate-spin w-4 h-4 border-2 border-t-transparent rounded-full mr-2",
                  `${themePrefix}-primary`
                )} />
                <Typography variant="body-sm" color="secondary">
                  Loading campaigns...
                </Typography>
              </div>
            ) : campaigns.length > 0 ? (
              campaigns.map(campaign => (
                <button
                  key={campaign.id}
                  onClick={() => handleSelectCampaign(campaign.id)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 w-full text-left rounded-md",
                    campaign.id === activeCampaignId ? 
                      `${themePrefix}-dropdown-item-active` : 
                      `${themePrefix}-dropdown-item`
                  )}
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <Typography className="truncate">{campaign.name}</Typography>
                </button>
              ))
            ) : (
              <div className="px-3 py-2">
                <Typography color="secondary">No campaigns in this group</Typography>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Done Button for Dialog Mode */}
      {inDialog && (
        <div className="p-3 border-t flex justify-end">
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </div>
  );

  // For dialog mode, render just the dropdown content
  if (inDialog) {
    return (
      <div className="w-full" ref={dropdownRef}>
        {renderDropdownContent()}
        
        {/* Join Group Dialog */}
        <JoinGroupDialog
          open={showJoinGroupDialog}
          onClose={() => setShowJoinGroupDialog(false)}
          onSuccess={() => {
            refreshGroups?.();
          }}
        />
      </div>
    );
  }

  // For header mode, render the button + dropdown
  return (
    <>
      <div className="relative w-full" ref={dropdownRef}>
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
          endIcon={<ChevronDown className="w-4 h-4 flex-shrink-0" />}
          startIcon={<Settings className="w-5 h-5 flex-shrink-0" />}
          disabled={groupsLoading}
        >
          <Typography variant="body" color="primary">
            {getContextText()}
          </Typography>
        </Button>
        
        {isOpen && renderDropdownContent()}
      </div>
      
      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={showJoinGroupDialog}
        onClose={() => setShowJoinGroupDialog(false)}
        onSuccess={() => {
          refreshGroups?.();
        }}
      />
    </>
  );
};

export default ContextSwitcher;