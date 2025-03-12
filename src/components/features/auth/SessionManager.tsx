import React, { useEffect } from 'react';
import useSessionManager from '../../../hooks/useSessionManager';
import { useGroups } from '../../../context/firebase';
import { useTheme } from '../../../context/ThemeContext';
import { ThemeName } from '../../../types/theme';

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
  
  // Sync theme from user profile when signed in
  useEffect(() => {
    if (activeGroupUserProfile?.preferences?.theme) {
      const savedTheme = activeGroupUserProfile.preferences.theme;
      
      // Check if the saved theme is a valid ThemeName
      if (isValidTheme(savedTheme)) {
        console.log('Applying saved theme preference:', savedTheme);
        setTheme(savedTheme);
      } else {
        console.warn('Invalid theme found in user preferences:', savedTheme);
      }
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