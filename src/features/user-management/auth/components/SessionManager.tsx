import React, { useEffect, useRef } from 'react';
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

  /**
   * The theme value this component last applied itself.
   *
   * `ThemeContext` builds `setTheme` and its context value inline on every
   * render, so both change identity whenever the theme changes. Without this,
   * a user picking a theme re-runs the effects below -- their `setTheme`
   * dependency just changed -- and they re-apply the STORED theme over the
   * one that was just chosen, snapping the UI back before the write to the
   * account has even landed.
   *
   * This is not the `initialThemeApplied` flag that used to live here. That
   * one applied a theme once per session and then ignored the profile
   * forever; this records the value applied, so a genuine change to the
   * stored theme is still honoured while a no-op re-run is not.
   */
  const lastApplied = useRef<string | null>(null);

  // Kept in its own effect, depending only on the account theme, so that a
  // later group switch (which changes `groupThemeName`, not this) never
  // re-triggers an application the account has already settled.
  useEffect(() => {
    if (!accountThemeName) return;
    if (lastApplied.current === accountThemeName) return;

    if (isValidTheme(accountThemeName)) {
      lastApplied.current = accountThemeName;
      setTheme(accountThemeName);
    } else {
      console.warn('Invalid theme found in account preferences:', accountThemeName);
    }
  }, [accountThemeName, setTheme]);

  // One-time migration path: only reachable while the account has no theme
  // of its own yet. Once the write above lands and `accountThemeName`
  // becomes truthy, this effect's own early return takes over permanently.
  useEffect(() => {
    // The account profile loads asynchronously, and until it arrives
    // `accountThemeName` is undefined for a reason that has nothing to do with
    // the user's preferences. Migrating on that would apply the membership's
    // stale theme AND write it over the account -- which is exactly what
    // happened: every reload silently reverted the chosen theme and destroyed
    // the stored one. "No account theme" is only knowable once there is an
    // account profile to look at.
    if (!userProfile) return;

    if (accountThemeName || !groupThemeName) {
      // Either the account already has a theme (handled above), or there is
      // neither an account nor a group theme -- leave ThemeContext on
      // whatever it already applied from localStorage.
      return;
    }

    // Same guard as above, for the same reason: without it, picking a theme
    // while the account still has none re-runs this effect, re-applies the
    // membership's theme over the choice, and fires the migration write again.
    if (lastApplied.current === groupThemeName) return;

    if (isValidTheme(groupThemeName)) {
      lastApplied.current = groupThemeName;
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
