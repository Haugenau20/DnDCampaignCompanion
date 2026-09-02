// src/features/user-management/profiles/hooks/useAccountTheme.ts
import { useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useUser } from "./useUser";
import { useTheme } from "core/themes/ThemeContext";
import { ThemeName } from "core/themes/types";

/**
 * What {@link useAccountTheme} exposes to its component.
 */
export interface UseAccountThemeResult {
  /**
   * Applies `themeName` to the theme context immediately, then persists it
   * to the signed-in user's account profile (`users/{uid}.preferences.theme`).
   */
  setAccountTheme: (themeName: ThemeName) => Promise<void>;
  /** The message from the most recent failed write, if any. */
  error: string | null;
  /** Whether a write is currently in flight. */
  saving: boolean;
}

/**
 * Account-scoped theme preference writer.
 *
 * Theme lives on the account (`users/{uid}`), not on a group membership, so
 * it cannot depend on which group happens to be active when the user signs
 * in. The theme is applied to {@link useTheme}'s context straight away --
 * the user asked for it and the local change is already correct -- and the
 * write to Firestore happens after. If that write fails, the error message
 * is surfaced but the already-applied theme is left alone: reverting the
 * screen to punish a failed write would be exactly the wrong thing to do
 * here, and is the behaviour another part of this feature is fixing
 * elsewhere.
 */
export function useAccountTheme(): UseAccountThemeResult {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useUser();
  const { setTheme } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setAccountTheme = async (themeName: ThemeName): Promise<void> => {
    setTheme(themeName);
    setError(null);

    if (!user) {
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile(user.uid, {
        preferences: { ...(userProfile?.preferences || {}), theme: themeName },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme preference");
    } finally {
      setSaving(false);
    }
  };

  return { setAccountTheme, error, saving };
}
