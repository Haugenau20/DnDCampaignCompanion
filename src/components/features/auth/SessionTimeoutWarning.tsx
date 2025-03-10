import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../../context/FirebaseContext';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Dialog from '../../core/Dialog';
import { AlertCircle, RefreshCw, Save } from 'lucide-react';
import { 
  INACTIVITY_TIMEOUT, 
  SESSION_WARNING_THRESHOLD 
} from '../../../constants/time';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

// Types of session timeout warnings
enum WarningType {
  INACTIVITY = 'inactivity',
  ABSOLUTE = 'absolute'
}

/**
 * Shows a warning when session is about to expire and allows user to extend it
 */
const SessionTimeoutWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<WarningType>(WarningType.INACTIVITY);
  const [timeRemaining, setTimeRemaining] = useState(5); // in minutes
  const [rememberMe, setRememberMe] = useState(false);
  const { user, refreshSession, signOut, renewSession } = useFirebase();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Check for session expiration time
  useEffect(() => {
    if (!user) return;
    
    const checkSessionTimeout = () => {
      try {
        const sessionInfoStr = localStorage.getItem('sessionInfo');
        if (!sessionInfoStr) return;
        
        const sessionInfo = JSON.parse(sessionInfoStr);
        const now = new Date().getTime();
        
        // Get current "Remember Me" setting
        setRememberMe(sessionInfo.rememberMe || false);
        
        // Check for absolute session expiration first
        const timeUntilAbsoluteExpiry = sessionInfo.expiresAt - now;
        
        // Check for inactivity timeout
        const lastActivity = sessionInfo.lastActivityAt || sessionInfo.createdAt;
        const timeUntilInactivityExpiry = (lastActivity + INACTIVITY_TIMEOUT) - now;
        
        // Determine which warning to show (prioritize absolute expiration)
        if (timeUntilAbsoluteExpiry > 0 && timeUntilAbsoluteExpiry < SESSION_WARNING_THRESHOLD) {
          setShowWarning(true);
          setWarningType(WarningType.ABSOLUTE);
          setTimeRemaining(Math.ceil(timeUntilAbsoluteExpiry / 60000)); // Convert to minutes
        } 
        else if (timeUntilInactivityExpiry > 0 && timeUntilInactivityExpiry < SESSION_WARNING_THRESHOLD) {
          setShowWarning(true);
          setWarningType(WarningType.INACTIVITY);
          setTimeRemaining(Math.ceil(timeUntilInactivityExpiry / 60000)); // Convert to minutes
        } 
        else {
          setShowWarning(false);
        }
      } catch (err) {
        console.error('Error checking session timeout:', err);
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkSessionTimeout, 60000);
    
    // Also check immediately
    checkSessionTimeout();
    
    return () => clearInterval(intervalId);
  }, [user]);
  
  const handleExtendSession = async () => {
    if (warningType === WarningType.INACTIVITY) {
      // For inactivity, just update the activity timestamp
      refreshSession();
    } else {
      // For absolute timeout, we need to renew the session completely
      await renewSession(rememberMe);
    }
    setShowWarning(false);
  };
  
  if (!showWarning) return null;
  
  return (
    <Dialog
      open={showWarning}
      onClose={() => {}} // Empty function since we don't want to close on backdrop click
      title="Session Expiring Soon"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
        <AlertCircle 
          className={`${themePrefix}-status-unknown`} 
          size={24} 
        />
          <Typography>
            {warningType === WarningType.INACTIVITY ? (
              <>Your session will expire in approximately {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''} due to inactivity.</>
            ) : (
              <>Your session will end in approximately {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}.</>
            )}
          </Typography>
        </div>
        
        <Typography color="secondary">
          {warningType === WarningType.INACTIVITY ? (
            <>Would you like to extend your session?</>
          ) : (
            <>Would you like to renew your session?</>
          )}
        </Typography>
        
        {/* Only show Remember Me option for absolute session timeout */}
        {warningType === WarningType.ABSOLUTE && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={clsx(
                "h-4 w-4 rounded focus:ring-offset-1",
                `${themePrefix}-input`,
                `focus:ring-${themePrefix}-primary border-${themePrefix}-card-border`
              )}
            />
            <label 
              htmlFor="rememberMe" 
              className={clsx(
                "ml-2 block text-sm",
                `${themePrefix}-typography`
              )}
            >
              Remember me for 30 days
            </label>
          </div>
        )}
        
        <div className="flex justify-end gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
          
          <Button
            onClick={handleExtendSession}
            startIcon={warningType === WarningType.INACTIVITY ? <RefreshCw size={16} /> : <Save size={16} />}
          >
            {warningType === WarningType.INACTIVITY ? 'Extend Session' : 'Renew Session'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default SessionTimeoutWarning;