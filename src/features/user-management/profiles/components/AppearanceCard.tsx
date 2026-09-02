// src/features/user-management/profiles/components/AppearanceCard.tsx
import React from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import { Check, AlertCircle } from "lucide-react";
import { useTheme } from "core/themes/ThemeContext";
import { themes } from "core/themes/definitions";
import { ThemeName } from "core/themes/types";
import { useAccountTheme } from "../hooks/useAccountTheme";

/**
 * Theme-preference section of the profile page.
 *
 * Renders one option card per theme (swatch + name); the current theme
 * carries a border, a focus ring and a check. Selecting an option goes
 * through {@link useAccountTheme}, which applies the theme immediately and
 * persists it to the account profile -- not to the active group's
 * membership, so the app's colours can never depend on which group happens
 * to be active when the user signs in.
 */
const AppearanceCard: React.FC = () => {
  const { theme } = useTheme();
  const { setAccountTheme, error } = useAccountTheme();

  return (
    <Card>
      <Card.Content className="space-y-3">
        <Typography id="appearance-heading" variant="h4">Appearance</Typography>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.values(themes).map((t) => {
            const isSelected = theme.name === t.name;

            return (
              <button
                key={t.name}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setAccountTheme(t.name as ThemeName)}
                className={clsx(
                  "flex flex-col items-center gap-2 p-4 rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  isSelected ? "selected-item" : "selectable-item"
                )}
              >
                {/* The swatch shows the theme's PAGE background, with its
                    accent as the inner dot. Showing the accent alone made
                    "Dark" render lighter than "Light", because the dark
                    theme's accent is a brighter blue than the light theme's --
                    the swatch was answering a question nobody was asking. The
                    inner dot is what still separates Light from Medieval,
                    which are both pale. */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 border flex items-center justify-center"
                  style={{
                    backgroundColor: t.colors.background.primary,
                    borderColor: t.colors.card.border,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: t.colors.primary }}
                  />
                </div>
                <span className="flex items-center gap-1 capitalize">
                  <Typography>{t.name}</Typography>
                  {isSelected && <Check className="w-4 h-4 success-icon" />}
                </span>
              </button>
            );
          })}
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
