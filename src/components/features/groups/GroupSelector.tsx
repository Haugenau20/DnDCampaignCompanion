// src/components/features/groups/GroupSelector.tsx
import React, { useState } from 'react';
import { useGroups, useInvitations, useUser } from '../../../context/firebase';
import Card from '../../core/Card';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Input from '../../core/Input';
import Dialog from '../../core/Dialog';
import { 
  Users, 
  Plus, 
  UserPlus, 
  Ticket, 
  LogIn, 
  Loader2, 
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

/**
 * Group selector shown after login for users belonging to multiple groups
 */
const GroupSelector: React.FC = () => {
  const { groups, switchGroup, createGroup, joinGroupWithToken, loading } = useGroups();
  const { validateToken } = useInvitations();
  const { validateGroupUsername } = useUser();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [username, setUsername] = useState('');
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Handle group selection
  const handleSelectGroup = (groupId: string) => {
    switchGroup(groupId);
  };
  
  // Handle create group form submission
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    try {
      setCreating(true);
      await createGroup(groupName.trim(), groupDescription.trim() || undefined);
      setShowCreateForm(false);
      // Reset form
      setGroupName('');
      setGroupDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };
  
  // Handle token validation
  const handleTokenChange = async (token: string) => {
    setInviteToken(token);
    
    if (!token.trim()) {
      setTokenValid(null);
      return;
    }
    
    setChecking(true);
    try {
      const isValid = await validateToken(token);
      setTokenValid(isValid);
    } catch (err) {
      setTokenValid(false);
    } finally {
      setChecking(false);
    }
  };
  
  // Handle username validation for a specific group
  const handleUsernameChange = async (username: string) => {
    setUsername(username);
    
    if (!username.trim() || !tokenValid) {
      setUsernameValid(null);
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }
    
    setChecking(true);
    try {
      // We need to get the group ID from the token to validate the username
      // For this demo, we'll just validate the format
      // In production, you would want to get the group ID from the token
      const result = await validateGroupUsername('dummy-group-id', username);
      setUsernameValid(result.isValid);
      setUsernameAvailable(result.isAvailable ?? null);
      setUsernameError(result.error || null);
    } catch (err) {
      setUsernameValid(false);
      setUsernameAvailable(false);
      setUsernameError(err instanceof Error ? err.message : 'Error validating username');
    } finally {
      setChecking(false);
    }
  };
  
  // Handle join group form submission
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!inviteToken.trim()) {
      setError('Invitation token is required');
      return;
    }
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!tokenValid) {
      setError('Invalid or expired invitation token');
      return;
    }
    
    if (!usernameValid || !usernameAvailable) {
      setError('Please choose a valid and available username');
      return;
    }
    
    try {
      setJoining(true);
      await joinGroupWithToken(inviteToken.trim(), username.trim());
      setShowJoinForm(false);
      // Reset form
      setInviteToken('');
      setUsername('');
      setTokenValid(null);
      setUsernameValid(null);
      setUsernameAvailable(null);
      setUsernameError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <Typography variant="h2" className="mb-6 text-center">
        Select a Group
      </Typography>
      
      {groups.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {groups.map(group => (
              <Card
                key={group.id}
                className="h-full cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectGroup(group.id)}
              >
                <Card.Content className="flex flex-col h-full p-6">
                  <div className={clsx(
                    "flex items-center justify-center p-3 rounded-full mb-4 w-12 h-12 mx-auto",
                    `${themePrefix}-icon-bg`
                  )}>
                    <Users className={clsx("w-6 h-6", `${themePrefix}-primary`)} />
                  </div>
                
                  <Typography variant="h3" className="mb-2 text-center">
                    {group.name}
                  </Typography>
                  
                  {group.description && (
                    <Typography color="secondary" className="mb-4 text-center">
                      {group.description}
                    </Typography>
                  )}
                  
                  <div className="mt-auto pt-4">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGroup(group.id);
                      }} 
                      fullWidth
                      isLoading={loading}
                    >
                      Enter Group
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Typography className="text-center mb-8">
          You don't belong to any groups yet. Create a new group or join with an invitation.
        </Typography>
      )}
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button 
          variant="outline"
          onClick={() => setShowCreateForm(true)}
          startIcon={<Plus size={18} />}
        >
          Create New Group
        </Button>
        <Button 
          variant="outline"
          onClick={() => setShowJoinForm(true)}
          startIcon={<Ticket size={18} />}
        >
          Join with Invitation
        </Button>
      </div>
      
      {/* Create Group Dialog */}
      <Dialog
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New Group"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Group Name *"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            required
            disabled={creating}
          />
          
          <Input
            label="Description (Optional)"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="Brief description of your group"
            isTextArea
            rows={3}
            disabled={creating}
          />
          
          {error && (
            <div className={clsx(
              "flex items-center gap-2",
              `${themePrefix}-form-error`
            )}>
              <AlertCircle size={16} />
              <Typography color="error">{error}</Typography>
            </div>
          )}
          
          <div className="flex justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              startIcon={<UserPlus size={18} />}
              isLoading={creating}
              disabled={!groupName.trim() || creating}
            >
              Create Group
            </Button>
          </div>
        </form>
      </Dialog>
      
      {/* Join Group Dialog */}
      <Dialog
        open={showJoinForm}
        onClose={() => setShowJoinForm(false)}
        title="Join Group"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleJoinGroup} className="space-y-4">
          <Input
            label="Invitation Token *"
            value={inviteToken}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="Enter your invitation token"
            required
            disabled={joining}
            error={tokenValid === false ? "Invalid or expired invitation token" : undefined}
            successMessage={tokenValid === true ? "Valid invitation" : undefined}
            endIcon={
                checking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : inviteToken && tokenValid === true ? (
                    <Check className={clsx("w-4 h-4", `${themePrefix}-form-success`)} />
                  ) : inviteToken && tokenValid === false ? (
                    <X className={clsx("w-4 h-4", `${themePrefix}-form-error`)} />
                  ) : null
                }
              />
              
              <Input
                label="Username in this Group *"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Choose a username for this group"
                required
                disabled={joining || !tokenValid}
                helperText="3-20 characters: a-z, æ, ø, å, 0-9, _ and -"
                error={usernameError || undefined}
                successMessage={usernameValid && usernameAvailable ? "Username available" : undefined}
                endIcon={
                  checking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : username && usernameValid && usernameAvailable ? (
                    <Check className={clsx("w-4 h-4", `${themePrefix}-form-success`)} />
                  ) : username && (usernameValid === false || usernameAvailable === false) ? (
                    <X className={clsx("w-4 h-4", `${themePrefix}-form-error`)} />
                  ) : null
                }
              />
              
              {error && (
                <div className={clsx(
                  "flex items-center gap-2",
                  `${themePrefix}-form-error`
                )}>
                  <AlertCircle size={16} />
                  <Typography color="error">{error}</Typography>
                </div>
              )}
              
              <div className="flex justify-end gap-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowJoinForm(false)}
                  disabled={joining}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  startIcon={<LogIn size={18} />}
                  isLoading={joining}
                  disabled={!inviteToken.trim() || !username.trim() || !tokenValid || !usernameValid || !usernameAvailable || joining}
                >
                  Join Group
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      );
    };
    
    export default GroupSelector;