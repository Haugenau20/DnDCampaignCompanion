import React from 'react';
import useSessionManager from '../../../hooks/useSessionManager';

/**
 * Component that manages user session activity tracking
 * Wraps child components and handles activity monitoring
 */
const SessionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the session manager hook
  useSessionManager();
  
  // Render children without adding any DOM elements
  return <>{children}</>;
};

export default SessionManager;