import React, { useState, useEffect } from 'react';
import { useInvitations, useUser } from '../../../context/firebase';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, UserPlus, Check, X, Loader2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

interface RegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onSignInClick?: () => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ 
  onSuccess, 
  onCancel,
  onSignInClick 
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { validateUsername } = useUser();
  const { signUpWithToken, validateToken} = useInvitations();
  const location = useLocation();
  
  // Extract token from query parameters on load
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    if (token) {
      setInviteToken(token);
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
          setError("This invitation link is invalid or has already been used.");
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
    if (!username || username.length < 3 || username.length > 20) {
      setUsernameValid(false);
      setUsernameAvailable(null);
      if (username.length < 3) {
        setUsernameError(username ? 'Username must be at least 3 characters' : null)
      }
      else if (username.length > 20) {
        setUsernameError('Username must be between 3-20 characters')
      }
      return;
    }

    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
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
  }, [username, validateUsername]);

  // Validate email format
  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate token is valid
    if (!tokenVerified) {
      setError("Invalid or expired invitation token");
      return;
    }

    // Validate email
    if (!email || !isEmailValid(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    // Validate username is valid and available
    if (!usernameValid || !usernameAvailable) {
      setError("Please choose a valid and available username");
      return;
    }

    setLoading(true);
    try {
      await signUpWithToken(inviteToken, email, password, username);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <Card.Header title="Create Account" />
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Invitation Token *"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              required
              disabled={loading || tokenVerified === true}
              error={tokenVerified === false ? "Invalid or expired invitation token" : undefined}
              successMessage={tokenVerified === true ? "Valid invitation" : undefined}
              helperText="Enter the invitation token you received"
              endIcon={
                checkingToken ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : inviteToken && tokenVerified === true ? (
                  <Check className={clsx("w-4 h-4", `${themePrefix}-form-success`)} />
                ) : inviteToken && tokenVerified === false ? (
                  <X className={clsx("w-4 h-4", `${themePrefix}-form-error`)} />
                ) : null
              }
            />
          </div>

          <div className="relative">
            <Input
              label="Email *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || tokenVerified !== true}
              error={email && !isEmailValid(email) ? "Please enter a valid email address" : undefined}
            />
          </div>

          <div className="relative">
            <Input
              label="Username *"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading || tokenVerified !== true}
              helperText="3-20 characters: a-z, æ, ø, å, 0-9, _ and -"
              error={usernameError || undefined}
              successMessage={usernameValid && usernameAvailable ? "Username available" : undefined}
              endIcon={
                checkingUsername ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : username && usernameValid && usernameAvailable ? (
                  <Check className={clsx("w-4 h-4", `${themePrefix}-form-success`)} />
                ) : username && (usernameValid === false || usernameAvailable === false) ? (
                  <X className={clsx("w-4 h-4", `${themePrefix}-form-error`)} />
                ) : null
              }
            />
          </div>

          <Input
            label="Password *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || tokenVerified !== true}
          />

          <Input
            label="Confirm Password *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || tokenVerified !== true}
            error={password !== confirmPassword && confirmPassword.length > 0 ? "Passwords don't match" : undefined}
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

          <div className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={
                loading || 
                tokenVerified !== true || 
                !usernameValid || 
                !usernameAvailable || 
                password !== confirmPassword ||
                !isEmailValid(email) ||
                password.length === 0
              }
              className="w-full"
              startIcon={<UserPlus />}
              isLoading={loading}
            >
              Create Account
            </Button>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                type="button"
                variant="link"
                onClick={onSignInClick}
                disabled={loading}
                startIcon={<LogIn />}
              >
                Sign In Instead
              </Button>
            </div>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
};

export default RegistrationForm;