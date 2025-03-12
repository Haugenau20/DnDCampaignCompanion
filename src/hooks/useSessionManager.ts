// src/hooks/useSessionManager.ts
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/firebase';
import { 
  ACTIVITY_UPDATE_THROTTLE,
  SESSION_CHECK_INTERVAL 
} from '../constants/time';

// Events to track for user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
  'click'
];

/**
 * Hook to manage user session and track activity
 * Implements sliding window approach for session timeouts
 */
export const useSessionManager = () => {
  const { signOut, user, refreshSession, checkSessionExpired } = useAuth();
  const lastActivityUpdate = useRef<number>(Date.now());
  
  // Check session status and log out if expired
  const checkSession = useCallback(() => {
    if (checkSessionExpired()) {
      signOut();
    }
  }, [signOut, checkSessionExpired]);
  
  // Update activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    // Only update if enough time has passed since the last update
    if (now - lastActivityUpdate.current > ACTIVITY_UPDATE_THROTTLE) {
      lastActivityUpdate.current = now;
      refreshSession();
    }
  }, [refreshSession]);
  
  // Set up activity tracking
  useEffect(() => {
    if (!user) return;
    
    // Check session on startup
    checkSession();
    
    // Set up periodic session checks
    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    
    // Track user activity to extend session
    const handleActivity = () => updateActivity();
    
    // Register all activity event listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Clean up event listeners and interval
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [user, checkSession, updateActivity]);
  
  return { checkSession };
};

export default useSessionManager;