// src/features/user-management/profiles/components/AppearanceCard.tsx
import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import { ChevronDown, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import { useUser } from "../hooks/useUser";
import { useTheme } from "core/themes/ThemeContext";
import { themes } from "core/themes/definitions";

/**
 * Theme-preference section of the profile page.
 *
 * A behaviour-preserving extraction of the theme dropdown that used to sit
 * inline in `UserProfile.tsx`, click-outside handler included. A later
 * change replaces this dropdown with three side-by-side option cards and
 * moves the preference from the group membership to the account.
 */
const AppearanceCard: React.FC = () => {
  const { user } = useAuth();
  const { activeGroup, activeGroupUserProfile } = useGroups();
  const { updateGroupUserProfile } = useUser();
  const { theme, setTheme } = useTheme();

  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChangeTheme = async (themeName: string) => {
    if (!user || saving || !activeGroup) return;

    try {
      setSaving(true);
      setError(null);

      // Update theme context immediately.
      setTheme(themeName as any);
      setThemeDropdownOpen(false);

      await updateGroupUserProfile(user.uid, {
        preferences: {
          ...(activeGroupUserProfile?.preferences || {}),
          theme: themeName,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme preference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Card.Content className="space-y-3">
        <Typography id="appearance-heading" variant="h4">Theme Preference</Typography>
        <div className="relative" ref={themeDropdownRef}>
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            disabled={saving}
            className="w-full flex items-center justify-between p-3 rounded-md transition-colors border bg-secondary"
            type="button"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <Typography className="capitalize">{theme.name} Theme</Typography>
            </div>
            <ChevronDown className="w-5 h-5" />
          </button>

          {themeDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg max-h-60 overflow-auto dropdown">
              <div className="py-1">
                {Object.values(themes).map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleChangeTheme(t.name)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-4 py-2 text-left",
                      theme.name === t.name ? "dropdown-item-active" : "dropdown-item"
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                    <span className="capitalize">{t.name}</span>
                    {theme.name === t.name && <Check className="w-4 h-4 ml-auto success-icon" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{error}</Typography>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default AppearanceCard;
