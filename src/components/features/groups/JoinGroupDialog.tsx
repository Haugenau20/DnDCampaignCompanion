// src/components/features/groups/JoinGroupDialog.tsx
import React, { useState, useEffect } from 'react';
import { useInvitations, useUser } from '../../../context/firebase';
import { useLocation } from 'react-router-dom';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Dialog from '../../core/Dialog';
import { 
  LogIn, 
  AlertCircle, 
  Check, 
  X, 
  Loader2 
} from 'lucide-react';

interface JoinGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JoinGroupDialog: React.FC<JoinGroupDialogProps> = ({ 
  open, 
  onClose,
  onSuccess 
}) => {
  
  const [inviteToken, setInviteToken] = useState('');
  const [username, setUsername] = useState('');
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  const { validateUsername } = useUser();
  const { validateToken, joinGroupWithToken } = useInvitations();
  const location = useLocation();

  // Extract token from query parameters on load
    useEffect(() => {
      const query = new URLSearchParams(location.search);
      const token = query.get('token');
      const groupIdParam = query.get('groupId');
      
      if (token) {
        setInviteToken(token);
      }
      
      if (groupIdParam) {
        setGroupId(groupIdParam);
      }
    }, [location]);

  // Verify token when it changes
  useEffect(() => {
    if (!inviteToken) {
      setTokenVerified(null);
      return;
    }
  
    const verifyToken = async () => {
      setCheckingToken(true);
      try {
        const isValid = await validateToken(inviteToken);
        setTokenVerified(isValid);
        if (!isValid) {
          setError("This invitation token is invalid or has already been used.");
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setTokenVerified(false);
        setError("Error validating invitation. Please try again.");
      } finally {
        setCheckingToken(false);
      }
    };
  
    verifyToken();
  }, [inviteToken, validateToken]);

  // Username validation with debounce
  useEffect(() => {
    if (!username || username.length < 3 || !tokenVerified) {
      setUsernameValid(false);
      setUsernameAvailable(null);
      if (username && username.length < 3) {
        setUsernameError('Username must be at least 3 characters')
      }
      return;
    }
  
    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        // NOTE: Make sure validateUsername also follows correct parameter signature
        const result = await validateUsername(username);
        setUsernameValid(result.isValid);
        setUsernameAvailable(result.isAvailable ?? null);
        setUsernameError(result.error || null);
      } catch (err) {
        setUsernameError('Error checking username');
        setUsernameValid(false);
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };
  
    const timer = setTimeout(() => {
      checkUsername();
    }, 500);
  
    return () => clearTimeout(timer);
  }, [username, validateUsername, tokenVerified]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
  
    // Validate token is valid
    if (!tokenVerified) {
      setError("Invalid or expired invitation token");
      return;
    }
  
    // Validate username is valid and available
    if (!usernameValid || !usernameAvailable) {
      setError("Please choose a valid and available username");
      return;
    }
  
    setJoining(true);
    try {
      await joinGroupWithToken(inviteToken, username);
      
      // Clear form
      setInviteToken('');
      setUsername('');
      
      // Close dialog and invoke success callback
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Join a Group"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Typography color="secondary">
          Enter your invitation token and choose a username for this group.
        </Typography>
        
        <div className="relative">
          <Input
            label="Invitation Token *"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            required
            disabled={joining}
            error={tokenVerified === false ? "Invalid or expired invitation token" : undefined}
            successMessage={tokenVerified === true ? "Valid invitation" : undefined}
            helperText="Enter the invitation token you received"
            endIcon={
              checkingToken ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : inviteToken && tokenVerified === true ? (
                <Check className="w-4 h-4 form-success" />
              ) : inviteToken && tokenVerified === false ? (
                <X className="w-4 h-4 form-error" />
              ) : null
            }
          />
        </div>

        <div className="relative">
          <Input
            label="Username for this Group *"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={joining || tokenVerified !== true}
            helperText="3-20 characters: a-z, æ, ø, å, 0-9, _ and -"
            error={usernameError || undefined}
            successMessage={usernameValid && usernameAvailable ? "Username available" : undefined}
            endIcon={
              checkingUsername ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : username && usernameValid && usernameAvailable ? (
                <Check className="w-4 h-4 form-success" />
              ) : username && (usernameValid === false || usernameAvailable === false) ? (
                <X className="w-4 h-4 form-error" />
              ) : null
            }
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{error}</Typography>
          </div>
        )}

        <div className="flex justify-end gap-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={joining}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={
              joining || 
              tokenVerified !== true || 
              !usernameValid || 
              !usernameAvailable
            }
            startIcon={<LogIn />}
            isLoading={joining}
          >
            Join Group
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default JoinGroupDialog;