// src/components/features/auth/adminPanel/GroupManagementView.tsx
import React, { useState } from 'react';
import { useAuth, useGroups } from '../../../../context/firebase'
import Typography from '../../../core/Typography';
import Input from '../../../core/Input';
import Button from '../../../core/Button';
import Card from '../../../core/Card';
import Dialog from '../../../core/Dialog';
import { useTheme } from '../../../../context/ThemeContext';
import { 
  AlertCircle, 
  Users, 
  Edit, 
  Calendar,
  User,
  Plus,
  X
} from 'lucide-react';
import clsx from 'clsx';

const GroupManagementView: React.FC = () => {
  const { groups, activeGroup, activeGroupId, activeGroupUserProfile, createGroup } = useGroups();
  const { user } = useAuth();
  
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // State
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Find the current group for detailed view
  const currentGroup = groups.find(g => g.id === activeGroupId);

  // Handle group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGroupName.trim()) return;
    
    setCreatingGroup(true);
    setError(null);
    
    try {
      await createGroup(newGroupName, newGroupDescription);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4">
          Group Management
        </Typography>
        
        <Button
          onClick={() => setShowCreateDialog(true)}
          startIcon={<Plus size={16} />}
        >
          Create New Group
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className={clsx(
          "flex items-center gap-2 p-3 rounded-lg mb-4",
          `${themePrefix}-typography-error`
        )}>
          <AlertCircle size={16} />
          <Typography color="error">{error}</Typography>
        </div>
      )}

      {!currentGroup ? (
        <div className={clsx(
          "text-center py-8 rounded-lg",
          `${themePrefix}-card`
        )}>
          <Users className={clsx(
            "w-12 h-12 mx-auto mb-4",
            `text-${themePrefix}-secondary`
          )} />
          <Typography color="secondary">
            No group selected
          </Typography>
        </div>
      ) : (
        <Card className="space-y-6">
          <Card.Content>
            {/* Group Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <Typography variant="h3">{currentGroup.name}</Typography>
                {currentGroup.description && (
                  <Typography color="secondary" className="mt-2">
                    {currentGroup.description}
                  </Typography>
                )}
              </div>
              <Button
                variant="outline"
                startIcon={<Edit size={16} />}
              >
                Edit Group
              </Button>
            </div>
            
            {/* Group Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <Typography variant="body-sm" color="secondary">Created By</Typography>
                <div className="flex items-center gap-2">
                  <User size={18} className={clsx(`${themePrefix}-typography-secondary`)} />
                  <Typography>
                    {currentGroup.createdBy === user?.uid 
                      ? activeGroupUserProfile?.username || 'You'
                      : 'Another User'
                    }
                  </Typography>
                </div>
              </div>
              <div className="space-y-1">
                <Typography variant="body-sm" color="secondary">Creation Date</Typography>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className={clsx(`${themePrefix}-typography-secondary`)} />
                  <Typography>
                    {currentGroup.createdAt instanceof Date 
                      ? currentGroup.createdAt.toLocaleDateString('en-uk', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : new Date(currentGroup.createdAt).toLocaleDateString('en-uk', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                    }
                  </Typography>
                </div>
              </div>
            </div>
            
            {/* Group ID for reference */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Typography variant="body-sm" color="secondary">Group ID (for reference)</Typography>
              <div className={clsx(
                "p-2 rounded mt-1 font-mono text-sm overflow-x-auto",
                `${themePrefix}-bg-secondary`
              )}>
                {currentGroup.id}
              </div>
            </div>
            
            {/* Admin notes */}
            <div className={clsx(
              "mt-6 p-3 rounded-lg border",
              `${themePrefix}-card`
            )}>
              <Typography variant="body-sm" color="secondary">
                <strong>Note:</strong> To manage users in this group, please use the "Users" tab.
                To manage registration tokens, use the "Registration Tokens" tab.
              </Typography>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Create Group Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create New Group"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateGroup}>
          <div className="space-y-4">
            <Input
              label="Group Name *"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
              placeholder="Enter group name"
            />
            
            <Input
              label="Description (optional)"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="Brief description of the group"
              isTextArea={true}
              rows={3}
            />
            
            {error && (
              <Typography color="error" className="text-sm">
                {error}
              </Typography>
            )}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
                type="button"
                startIcon={<X size={16} />}
                disabled={creatingGroup}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                startIcon={<Plus size={16} />}
                disabled={!newGroupName.trim() || creatingGroup}
                isLoading={creatingGroup}
              >
                Create Group
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default GroupManagementView;