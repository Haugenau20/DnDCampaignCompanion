import React, { useEffect } from 'react';
import useSessionManager from '../hooks/useSessionManager';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../../groups/hooks/useGroups';
import { useUser } from '../../profiles/hooks/useUser';
import { useTheme } from 'core/themes/ThemeContext';
import { ThemeName } from 'core/themes/types';

/**
 * Helper function to validate the theme name
 */
function isValidTheme(theme: string): theme is ThemeName {
  return ['light', 'dark', 'medieval'].includes(theme);
}

/**
 * Component that manages user session activity tracking and theme preference
 * synchronization. Wraps child components and handles activity monitoring.
 *
 * Theme resolution order:
 * - an account theme (`users/{uid}.preferences.theme`) always wins, since it
 *   cannot depend on which group happens to be active at sign-in;
 * - with no account theme, the active group membership's theme is applied
 *   and written up to the account as a one-time migration -- the same value
 *   the old per-membership behaviour would have applied at this sign-in, so
 *   the migration changes nothing on screen;
 * - with neither, the theme context is left on whatever it already loaded
 *   from `localStorage`.
 *
 * There is no per-group re-application to guard against: once the account
 * has a theme, later group switches never change it.
 */
const SessionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the session manager hook
  useSessionManager();

  const { user } = useAuth();
  const { activeGroupUserProfile } = useGroups();
  const { userProfile, updateUserProfile } = useUser();
  const { setTheme } = useTheme();

  const accountThemeName = userProfile?.preferences?.theme;
  const groupThemeName = activeGroupUserProfile?.preferences?.theme;

  // Kept in its own effect, depending only on the account theme, so that a
  // later group switch (which changes `groupThemeName`, not this) never
  // re-triggers an application the account has already settled.
  useEffect(() => {
    if (!accountThemeName) return;

    if (isValidTheme(accountThemeName)) {
      setTheme(accountThemeName);
    } else {
      console.warn('Invalid theme found in account preferences:', accountThemeName);
    }
  }, [accountThemeName, setTheme]);

  // One-time migration path: only reachable while the account has no theme
  // of its own yet. Once the write above lands and `accountThemeName`
  // becomes truthy, this effect's own early return takes over permanently.
  useEffect(() => {
    if (accountThemeName || !groupThemeName) {
      // Either the account already has a theme (handled above), or there is
      // neither an account nor a group theme -- leave ThemeContext on
      // whatever it already applied from localStorage.
      return;
    }

    if (isValidTheme(groupThemeName)) {
      setTheme(groupThemeName);

      // Carry the theme of whichever group is active right now up to the
      // account, so it stops depending on which group happens to be active
      // at a future sign-in.
      if (user) {
        updateUserProfile(user.uid, {
          preferences: { ...(userProfile?.preferences || {}), theme: groupThemeName },
        }).catch(() => {
          // Migration is best-effort: a failed write here simply leaves the
          // group-level value in place to be retried next sign-in.
        });
      }
    } else {
      console.warn('Invalid theme found in group preferences:', groupThemeName);
    }
  }, [accountThemeName, groupThemeName, setTheme, updateUserProfile, user, userProfile]);

  // Render children without adding any DOM elements
  return <>{children}</>;
};

export default SessionManager;
