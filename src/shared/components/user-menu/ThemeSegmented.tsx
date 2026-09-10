// src/shared/components/user-menu/ThemeSegmented.tsx
import React from "react";
import clsx from "clsx";
import { useTheme } from "core/themes/ThemeContext";
import { useAccountTheme } from "features/user-management";
import { ThemeName } from "core/themes/types";
import Typography from "core/components/Typography";

/**
 * The theme options, in the order the segmented control shows them.
 *
 * This was three options with the third abbreviated to "Med.", because
 * "Medieval" would not fit beside the other two at the popover's width. That
 * theme is retired (D40) and the abbreviation went with it, so both labels are
 * now written in full.
 */
const OPTIONS: Array<{ name: ThemeName; label: string }> = [
  { name: "light", label: "Light" },
  { name: "dark", label: "Dark" },
];

/**
 * Inline two-way theme switch inside the account menu.
 *
 * Replaces {@link ThemeSelector}'s hover dropdown for signed-in users: theme
 * is account-scoped (via {@link useAccountTheme}), not per group membership,
 * so it belongs beside the other account-level settings rather than behind
 * its own separate control.
 */
const ThemeSegmented: React.FC = () => {
  const { theme } = useTheme();
  const { setAccountTheme, error } = useAccountTheme();

  return (
    <div role="none">
      <div
        role="group"
        aria-label="Theme"
        className="flex gap-1 p-1 rounded-md bg-secondary"
      >
        {OPTIONS.map((option) => {
          const isSelected = theme.name === option.name;
          return (
            <button
              key={option.name}
              type="button"
              role="menuitem"
              aria-pressed={isSelected}
              onClick={() => setAccountTheme(option.name)}
              className={clsx(
                "flex-1 px-2 py-1 rounded text-sm chip",
                isSelected && "chip-selected"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error && (
        <Typography variant="body-sm" color="error" className="mt-1 px-1">
          {error}
        </Typography>
      )}
    </div>
  );
};

export default ThemeSegmented;
