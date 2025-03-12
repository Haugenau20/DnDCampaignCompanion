// src/components/features/groups/GroupDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useGroups } from '../../../context/firebase';
import { useTheme } from '../../../context/ThemeContext';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Dialog from '../../core/Dialog';
import Input from '../../core/Input';
import { ChevronDown, Plus, Users, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * Group dropdown component for switching between groups and creating new ones
 */
const GroupDropdown: React.FC = () => {
  const { 
    groups, 
    activeGroupId, 
    setActiveGroup,
    createGroup,
    activeGroupUserProfile
  } = useGroups();
  
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if current user is admin
  const isAdmin = activeGroupUserProfile?.role === 'admin' || false;
  
  // Current group name
  const currentGroup = groups.find(g => g.id === activeGroupId);
  const currentGroupName = currentGroup?.name || 'Select Group';

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
    await setActiveGroup(groupId);
    setIsOpen(false);
  };

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
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
          endIcon={<ChevronDown className="w-4 h-4" />}
          startIcon={<Users className="w-5 h-5" />}
        >
          {currentGroupName}
        </Button>
        
        {isOpen && (
          <div className={clsx(
            "absolute top-full left-0 mt-1 w-64 rounded-md shadow-lg z-10",
            `${themePrefix}-dropdown`
          )}>
            <div className="py-1">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 w-full text-left",
                    group.id === activeGroupId ? 
                      `${themePrefix}-dropdown-item-active` : 
                      `${themePrefix}-dropdown-item`
                  )}
                >
                  <Users className="w-4 h-4" />
                  <Typography>{group.name}</Typography>
                </button>
              ))}
              
              {/* Only show create option for admins */}
              {isAdmin && (
                <>
                  <div className={clsx("h-px my-1", `${themePrefix}-dropdown-divider`)} />
                  <button
                    onClick={() => {
                      setShowCreateDialog(true);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 w-full text-left",
                      `${themePrefix}-dropdown-item`
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    <Typography>Create New Group</Typography>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

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

export default GroupDropdown;