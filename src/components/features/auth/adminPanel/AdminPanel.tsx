// src/components/features/auth/adminPanel/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { useGroups } from '../../../../context/firebase';
import Typography from '../../../core/Typography';
import Button from '../../../core/Button';
import Card from '../../../core/Card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Import admin view components
import TokenManagementView from './TokenManagementView';
import UserManagementView from './UserManagementView';
import CampaignManagementView from './CampaignManagementView';
import GroupManagementView from './GroupManagementView';

// Tabs enum
enum AdminTab {
  Tokens = 'tokens',
  Users = 'users',
  Campaigns = 'campaigns',
  Groups = 'groups'
}

interface AdminPanelProps {
  onClose?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  // Use only the consolidated useGroups hook
  const { 
    activeGroupUserProfile, 
    isAdmin, 
    activeGroup, 
    activeGroupId,
    loading 
  } = useGroups();
  
  // Local loading state with timeout to avoid infinite loading
  const [localLoading, setLocalLoading] = useState(true);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.Tokens);

  // Log the admin status and relevant state for debugging
  useEffect(() => {
    console.log("AdminPanel: Loading state =", loading);
    console.log("AdminPanel: activeGroupUserProfile =", activeGroupUserProfile);
    console.log("AdminPanel: isAdmin =", isAdmin);
    console.log("AdminPanel: activeGroup =", activeGroup);
    console.log("AdminPanel: activeGroupId =", activeGroupId);
  }, [loading, activeGroupUserProfile, isAdmin, activeGroup, activeGroupId]);

  // Set up a timeout to stop showing the loading state after 3 seconds
  // even if the loading state from the hook hasn't resolved
  useEffect(() => {
    if (!loading) {
      setLocalLoading(false);
    } else {
      // If still loading after 3 seconds, stop showing loading indicator
      const timer = setTimeout(() => {
        console.log("AdminPanel: Forcing loading to complete after timeout");
        setLocalLoading(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading state only for a maximum of 3 seconds
  if (localLoading && !activeGroup) {
    return (
      <Card>
        <Card.Content className="text-center py-8">
          <Loader2 className={clsx("w-16 h-16 mx-auto mb-4 animate-spin", `primary`)} />
          <Typography variant="h3" className="mb-2">
            Loading Admin Panel
          </Typography>
          <Typography color="secondary">
            Checking your access permissions
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  // If not admin or no active group, show access denied
  if (!isAdmin || !activeGroup) {
    return (
      <Card>
        <Card.Content className="text-center py-8">
          <ShieldAlert className={clsx("w-16 h-16 mx-auto mb-4", `delete-button`)} />
          <Typography variant="h3" className="mb-2">
            Access Denied
          </Typography>
          <Typography color="secondary">
            You do not have administrative privileges for this group.
          </Typography>
          <Typography variant="body-sm" color="secondary" className="mt-2">
            {!isAdmin ? "Your role is not admin." : "No active group selected."}
          </Typography>
          {onClose && (
            <Button
              className="mt-4"
              onClick={onClose}
            >
              Back
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Content className="space-y-6">
        {/* Group name */}
        <Typography variant="h3" className="mb-4">
          {activeGroup.name} - Administration
        </Typography>
        
        {/* Tab Navigation */}
        <div className={clsx("flex flex-wrap border-b", `navigation`)}>
          <button
            className={clsx(
              "py-2 px-4 font-medium flex items-center gap-2",
              activeTab === AdminTab.Tokens 
                ? `navigation-item-active` 
                : `navigation-item`
            )}
            onClick={() => setActiveTab(AdminTab.Tokens)}
          >
            Registration Tokens
          </button>
          <button
            className={clsx(
              "py-2 px-4 font-medium flex items-center gap-2",
              activeTab === AdminTab.Users 
                ? `navigation-item-active` 
                : `navigation-item`
            )}
            onClick={() => setActiveTab(AdminTab.Users)}
          >
            Users
          </button>
          <button
            className={clsx(
              "py-2 px-4 font-medium flex items-center gap-2",
              activeTab === AdminTab.Campaigns 
                ? `navigation-item-active` 
                : `navigation-item`
            )}
            onClick={() => setActiveTab(AdminTab.Campaigns)}
          >
            Campaigns
          </button>
          <button
            className={clsx(
              "py-2 px-4 font-medium flex items-center gap-2",
              activeTab === AdminTab.Groups 
                ? `navigation-item-active` 
                : `navigation-item`
            )}
            onClick={() => setActiveTab(AdminTab.Groups)}
          >
            Group
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === AdminTab.Tokens && (
          <TokenManagementView />
        )}
        
        {activeTab === AdminTab.Users && (
          <UserManagementView />
        )}
        
        {activeTab === AdminTab.Campaigns && (
          <CampaignManagementView />
        )}
        
        {activeTab === AdminTab.Groups && (
          <GroupManagementView />
        )}

        {/* Close button */}
        {onClose && (
          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default AdminPanel;