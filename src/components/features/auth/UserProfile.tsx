// src/components/features/auth/UserProfile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useGroups, useUser } from '../../../context/firebase';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { User, Save, Edit, Check, X, Loader2, AlertCircle, PlusCircle, Trash2, Palette, ChevronDown, Star } from 'lucide-react';
import { CharacterNameEntry } from '../../../types/user';
import { useTheme } from '../../../context/ThemeContext';
import { themes } from '../../../themes';
import clsx from 'clsx';

interface UserProfileProps {
  onSaved?: () => void;
  onCancel?: () => void;
}

// Simple function to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const UserProfile: React.FC<UserProfileProps> = ({ onSaved, onCancel }) => {
  const { user } = useAuth();
  const { activeGroup, activeGroupUserProfile } = useGroups();
  const { validateUsername, updateUserProfile, updateGroupUserProfile } = useUser();
  
  const { theme, setTheme } = useTheme();
  const themePrefix = theme.name;
  
  const [newUsername, setNewUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Theme dropdown state
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Character name state
  const [characterNames, setCharacterNames] = useState<CharacterNameEntry[]>([]);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (activeGroupUserProfile) {
      setNewUsername(activeGroupUserProfile.username || '');
      
      // Set the active character ID from the user profile
      setActiveCharacterId(activeGroupUserProfile.activeCampaignId || null);
      
      // Initialize character names from profile
      if (activeGroupUserProfile.characters && activeGroupUserProfile.characters.length > 0) {
        setCharacterNames(activeGroupUserProfile.characters);
      } else {
        setCharacterNames([]);
      }
    }
  }, [activeGroupUserProfile]);
  
  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Username validation with debounce
  useEffect(() => {
    if (!isEditingUsername || !newUsername || !activeGroup || newUsername === activeGroupUserProfile?.username) {
      setUsernameValid(true);
      setUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (newUsername.length < 3) {
      setUsernameValid(false);
      setUsernameAvailable(null);
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    const checkUsername = async () => {
      setChecking(true);
      try {
        const result = await validateUsername(newUsername);
        setUsernameValid(result.isValid);
        setUsernameAvailable(result.isAvailable ?? null);
        setUsernameError(result.error || null);
      } catch (err) {
        setUsernameError('Error checking username');
        setUsernameValid(false);
        setUsernameAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    // Debounce username validation
    const timer = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, validateUsername, isEditingUsername, activeGroupUserProfile?.username, activeGroup]);

  const handleAddCharacterName = async () => {
    if (!newCharacterName.trim() || !user || saving || !activeGroup) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Create new character name entry
      const newCharacter = {
        id: generateId(),
        name: newCharacterName.trim()
      };
      
      // Update local state
      const updatedCharacterNames = [...characterNames, newCharacter];
      setCharacterNames(updatedCharacterNames);
      
      // If this is the first character, automatically set it as active
      let newActiveId = activeCharacterId;
      if (characterNames.length === 0 && !activeCharacterId) {
        newActiveId = newCharacter.id;
        setActiveCharacterId(newActiveId);
      }
      
      // Update in database
      await updateGroupUserProfile(user.uid, {
        characters: updatedCharacterNames,
        activeCampaignId: newActiveId
      });
      
      // Clear input field
      setNewCharacterName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add character name');
      // Revert local state if database update failed
      setCharacterNames(characterNames);
      setActiveCharacterId(activeCharacterId);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCharacterName = (id: string) => {
    const character = characterNames.find(c => c.id === id);
    if (character) {
      setNewCharacterName(character.name);
      setEditingCharacterId(id);
    }
  };

  const handleUpdateCharacterName = async () => {
    if (!editingCharacterId || !newCharacterName.trim() || !user || saving || !activeGroup) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Update in local state
      const updatedCharacterNames = characterNames.map(char => 
        char.id === editingCharacterId 
          ? { ...char, name: newCharacterName.trim() } 
          : char
      );
      
      setCharacterNames(updatedCharacterNames);
      
      // Update in database
      await updateGroupUserProfile(user.uid, {
        characters: updatedCharacterNames
      });
      
      // Reset state
      setNewCharacterName('');
      setEditingCharacterId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update character name');
      // Revert local state if database update failed
      setCharacterNames(characterNames);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEditCharacter = () => {
    setNewCharacterName('');
    setEditingCharacterId(null);
  };

  const handleSetActiveCharacter = async (id: string) => {
    if (!user || saving || !activeGroup) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Update local state
      setActiveCharacterId(id);
      
      // Update in database
      await updateGroupUserProfile(user.uid, {
        activeCampaignId: id
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active character');
      // Revert local state if database update failed
      setActiveCharacterId(activeCharacterId);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCharacterName = async (id: string) => {
    if (!user || saving || !activeGroup) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Update local state
      const updatedCharacterNames = characterNames.filter(char => char.id !== id);
      setCharacterNames(updatedCharacterNames);
      
      // If deleting the active character, reset activeCharacterId
      let newActiveId: string | null = activeCharacterId;
      if (activeCharacterId === id) {
        newActiveId = updatedCharacterNames.length > 0 ? updatedCharacterNames[0].id : null;
        setActiveCharacterId(newActiveId);
      }
      
      // Update in database
      await updateGroupUserProfile(user.uid, {
        characters: updatedCharacterNames,
        activeCampaignId: newActiveId
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete character name');
      // Revert local state if database update failed
      setCharacterNames(characterNames);
      setActiveCharacterId(activeCharacterId);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTheme = async (themeName: string) => {
    if (!user || saving || !activeGroup) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Update theme context immediately
      setTheme(themeName as any);
      setThemeDropdownOpen(false);
      
      // Save preference to database
      await updateGroupUserProfile(user.uid, {
        preferences: {
          ...(activeGroupUserProfile?.preferences || {}),
          theme: themeName
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theme preference');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !activeGroupUserProfile || !usernameValid || !usernameAvailable || saving || !activeGroup) return;
    
    if (newUsername === activeGroupUserProfile.username) {
      setIsEditingUsername(false);
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Update username
      await updateGroupUserProfile(user.uid, {
        username: newUsername
      });
      
      // Close edit mode
      setIsEditingUsername(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !activeGroupUserProfile || !activeGroup) {
    return (
      <Card>
        <Card.Content>
          <Typography>You must be signed in and part of a group to view your profile.</Typography>
        </Card.Content>
      </Card>
    );
  }

  // Find the active character name for display
  const activeCharacter = characterNames.find(char => char.id === activeCharacterId);
  const activeDisplayName = activeCharacter ? activeCharacter.name : null;

  return (
    <Card className="max-w-md mx-auto">
      <Card.Content className="space-y-8">
        {/* Group Display */}
        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Current Group</Typography>
          <Typography variant="h4">{activeGroup.name}</Typography>
        </div>
        
        {/* Email section */}
        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Email</Typography>
          <Typography>{user.email}</Typography>
        </div>

        {/* Username section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Typography variant="body-sm" color="secondary">Username in this Group</Typography>
            {!isEditingUsername ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingUsername(true)}
                startIcon={<Edit size={16} />}
              >
                Change
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingUsername(false);
                  setNewUsername(activeGroupUserProfile.username);
                }}
                startIcon={<X size={16} />}
              >
                Cancel
              </Button>
            )}
          </div>
          
          {isEditingUsername ? (
            <form onSubmit={handleSubmitUsername} className="flex items-start gap-2">
              <div className="relative flex-1">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={saving}
                  error={usernameError || undefined}
                  successMessage={usernameValid && usernameAvailable && newUsername !== activeGroupUserProfile.username ? "Username available" : undefined}
                  endIcon={
                    checking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : newUsername && usernameValid && usernameAvailable ? (
                      <Check className={clsx("w-4 h-4", `${themePrefix}-success-icon`)} />
                    ) : newUsername && (usernameValid === false || usernameAvailable === false) ? (
                      <X className={clsx("w-4 h-4", `${themePrefix}-form-error`)} />
                    ) : null
                  }
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !usernameValid || !usernameAvailable || newUsername === activeGroupUserProfile.username}
                isLoading={saving}
              >
                Save
              </Button>
            </form>
          ) : (
            <Typography>{activeGroupUserProfile.username}</Typography>
          )}
        </div>

        {/* User Role */}
        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Role in this Group</Typography>
          <Typography color={activeGroupUserProfile.role === 'admin' ? 'primary' : 'default'}>
            {activeGroupUserProfile.role === 'admin' ? 'Administrator' : 'Member'}
          </Typography>
        </div>

        {/* Active Character Display */}
        <div className="space-y-2">
          <Typography variant="body-sm" color="secondary">Active Character</Typography>
          <div className={clsx(
            "p-3 rounded-lg",
            `${themePrefix}-bg-secondary`
          )}>
            {activeDisplayName ? (
              <div className="flex items-center">
                <Star size={16} className={clsx("mr-2", `${themePrefix}-accent`)} />
                <Typography>{activeDisplayName}</Typography>
              </div>
            ) : (
              <Typography color="secondary">
                No active character selected. Actions will use your username.
              </Typography>
            )}
          </div>
        </div>

        {/* Theme selector section */}
        <div className="space-y-3">
          <Typography variant="h4">Theme Preference</Typography>
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              disabled={saving}
              className={clsx(
                "w-full flex items-center justify-between p-3 rounded-md transition-colors border",
                `${themePrefix}-bg-secondary`
              )}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <Typography className="capitalize">{theme.name} Theme</Typography>
              </div>
              <ChevronDown className="w-5 h-5" />
            </button>
            
            {/* Dropdown menu */}
            {themeDropdownOpen && (
              <div className={clsx(
                "absolute z-10 mt-1 w-full rounded-md shadow-lg max-h-60 overflow-auto",
                `${themePrefix}-dropdown`
              )}>
                <div className="py-1">
                  {Object.values(themes).map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleChangeTheme(t.name)}
                      className={clsx(
                        "w-full flex items-center gap-2 px-4 py-2 text-left",
                        theme.name === t.name 
                          ? `${themePrefix}-dropdown-item-active` 
                          : `${themePrefix}-dropdown-item`
                      )}
                    >
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.colors.primary }}
                      />
                      <span className="capitalize">{t.name}</span>
                      {theme.name === t.name && (
                        <Check className={clsx("w-4 h-4 ml-auto", `${themePrefix}-success-icon`)} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Character Names section */}
        <div className="space-y-3">
          <Typography variant="h4">Characters</Typography>
          <Typography variant="body-sm" color="secondary">
            Add and select characters to use for creating content
          </Typography>
          
          {/* Character name input */}
          <div className="flex gap-2">
            <Input
              placeholder={editingCharacterId ? "Edit character..." : "Add new character..."}
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              disabled={saving}
              className="flex-1"
            />
            
            {editingCharacterId ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditCharacter}
                  startIcon={<X size={16} />}
                  disabled={saving}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpdateCharacterName}
                  startIcon={<Check size={16} />}
                  disabled={!newCharacterName.trim() || saving}
                  isLoading={saving}
                />
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleAddCharacterName}
                startIcon={<PlusCircle size={16} />}
                disabled={!newCharacterName.trim() || saving}
                isLoading={saving}
              >
                Add
              </Button>
            )}
          </div>
          
          {/* Character names list */}
          {characterNames.length > 0 ? (
            <div className="space-y-2 mt-3">
              {characterNames.map((character) => (
                <div 
                  key={character.id} 
                  className={clsx(
                    "flex items-center justify-between p-3 rounded-md",
                    character.id === activeCharacterId 
                      ? `${themePrefix}-selected-item` 
                      : `${themePrefix}-selectable-item`
                  )}
                >
                  <div className="flex items-center">
                    {character.id === activeCharacterId && (
                      <Star size={16} className={clsx("mr-2", `${themePrefix}-accent`)} />
                    )}
                    <Typography>{character.name}</Typography>
                  </div>
                  <div className="flex gap-2">
                    {character.id !== activeCharacterId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetActiveCharacter(character.id)}
                        disabled={saving}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCharacterName(character.id)}
                      startIcon={<Edit size={16} />}
                      disabled={saving || editingCharacterId !== null}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCharacterName(character.id)}
                      startIcon={<Trash2 size={16} className={`${themePrefix}-form-error`} />}
                      disabled={saving}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={clsx(
              "py-2 px-3 rounded-md text-center",
              `${themePrefix}-bg-secondary`
            )}>
              <Typography color="secondary">No character names added yet</Typography>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className={clsx("flex items-center gap-2", `${themePrefix}-form-error`)}>
            <AlertCircle size={16} />
            <Typography color="error">{error}</Typography>
          </div>
        )}

        {/* Close button */}
        {onCancel && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              Close
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default UserProfile;