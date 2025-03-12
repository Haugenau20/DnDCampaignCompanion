// components/shared/ContextSwitcher.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGroups, useCampaigns } from '../../context/firebase';
import { useTheme } from '../../context/ThemeContext';
import Button from '../core/Button';
import Typography from '../core/Typography';
import { ChevronDown, Settings, BookOpen, Users } from 'lucide-react';
import clsx from 'clsx';

/**
 * A dropdown component for switching between groups and campaigns
 */
const ContextSwitcher: React.FC = () => {
  const { groups, activeGroupId, setActiveGroup, activeGroupUserProfile, loading: groupsLoading } = useGroups();
  const { campaigns, activeCampaignId, setActiveCampaign } = useCampaigns();
  
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if current user is admin
  const isAdmin = activeGroupUserProfile?.role === 'admin' || false;
  
  // Look up current group and campaign directly each render
  const currentGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;
  const currentCampaign = activeCampaignId ? campaigns.find(c => c.id === activeCampaignId) : null;
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('ContextSwitcher: activeGroupId =', activeGroupId);
    console.log('ContextSwitcher: activeCampaignId =', activeCampaignId);
    console.log('ContextSwitcher: currentGroup =', currentGroup);
    console.log('ContextSwitcher: currentCampaign =', currentCampaign);

  }, [activeGroupId, activeCampaignId, currentGroup, currentCampaign, campaigns.length]);
  
  // Generate display text - recalculated every render
  const getContextText = useCallback(() => {
    // During initial loading, use localStorage values if available
    if (groupsLoading) {
      if (activeGroupId) {
        return activeCampaignId ? `Loading... / ${activeCampaignId}` : `Loading... / No Campaign`;
      }
      return 'Loading...';
    }
    
    if (!currentGroup) return activeGroupId ? `${activeGroupId} / Loading...` : 'Select Group';
    if (!currentCampaign) return `${currentGroup.name} / No Campaign`;
    return `${currentGroup.name} / ${currentCampaign.name}`;
  }, [currentGroup, currentCampaign, activeGroupId, activeCampaignId, groupsLoading]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle group selection
  const handleSelectGroup = async (groupId: string) => {
    // Set loading state
    setLoadingCampaigns(true);
    
    try {
      // Change group - this should trigger campaign loading internally
      await setActiveGroup(groupId);
    } catch (err) {
      console.error('Error changing group in context switcher:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Handle campaign selection
  const handleSelectCampaign = async (campaignId: string) => {
    console.log(`ContextSwitcher: Selecting campaign ${campaignId}`);
    try {
      await setActiveCampaign(campaignId);
      setIsOpen(false);
    } catch (err) {
      console.error('Error changing campaign in context switcher:', err);
    }
  };

  // Get current display text - recalculated on every render
  const contextText = getContextText();
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 max-w-xs truncate"
        endIcon={<ChevronDown className="w-4 h-4 flex-shrink-0" />}
        startIcon={<Settings className="w-5 h-5 flex-shrink-0" />}
        disabled={groupsLoading && !activeGroupId} // Disable if loading with no context
      >
        <Typography variant="body" color="primary">
          {contextText}
        </Typography>
      </Button>
      
      {isOpen && (
        <div className={clsx(
          "absolute top-full left-0 mt-1 w-72 rounded-md shadow-lg z-10",
          `${themePrefix}-dropdown`
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
          
          {/* Admin Note */}
          {isAdmin && (
            <div className={clsx(
              "p-2 border-t text-center",
              `${themePrefix}-dropdown-divider`
            )}>
              <Typography variant="body-sm" color="secondary">
                For group and campaign management, use the Admin Panel
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextSwitcher;