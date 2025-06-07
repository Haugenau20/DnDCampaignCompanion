import React, { useEffect, useRef } from 'react';
import useSessionManager from '../../../hooks/useSessionManager';
import { useGroups } from '../../../context/firebase';
import { useTheme } from '../../../themes/ThemeContext';
import { ThemeName } from '../../../themes/types';

/**
 * Component that manages user session activity tracking and theme preference synchronization
 * Wraps child components and handles activity monitoring
 */
const SessionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the session manager hook
  useSessionManager();
  
  // Get user profile for theme preference
  const { activeGroupUserProfile } = useGroups();
  const { setTheme } = useTheme();
  
  // Use a ref to track if theme has been applied from profile
  const initialThemeApplied = useRef(false);
  
  // Sync theme from user profile when signed in, but only once after login
  useEffect(() => {
    if (activeGroupUserProfile?.preferences?.theme && !initialThemeApplied.current) {
      const savedTheme = activeGroupUserProfile.preferences.theme;
      
      // Check if the saved theme is a valid ThemeName
      if (isValidTheme(savedTheme)) {
        console.log('Applying saved theme preference:', savedTheme);
        setTheme(savedTheme);
        // Mark that we've applied the initial theme
        initialThemeApplied.current = true;
      } else {
        console.warn('Invalid theme found in user preferences:', savedTheme);
      }
    }
    
    // Reset the flag when user profile becomes null (logout)
    if (!activeGroupUserProfile) {
      initialThemeApplied.current = false;
    }
  }, [activeGroupUserProfile, setTheme]);
  
  // Helper function to validate the theme name
  function isValidTheme(theme: string): theme is ThemeName {
    return ['light', 'dark', 'medieval'].includes(theme);
  }
  
  // Render children without adding any DOM elements
  return <>{children}</>;
};

export default SessionManager;