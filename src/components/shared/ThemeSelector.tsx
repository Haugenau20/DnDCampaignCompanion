// components/shared/ThemeSelector.tsx
import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { themes } from '../../themes';
import { Palette } from 'lucide-react';
import Button from '../core/Button';
import clsx from 'clsx';

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        startIcon={<Palette className="w-5 h-5" />}
        size="sm"
        aria-label="Change theme"
      >
      </Button>
      
      <div className={clsx(
        "absolute right-0 mt-2 w-48 py-2 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border z-50",
        `${themePrefix}-dropdown`
      )}>
        {Object.values(themes).map((t) => (
          <Button
            variant="ghost"
            centered={false}
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={clsx(
              "w-full px-4 py-2 text-left transition-colors",
              theme.name === t.name ? `${themePrefix}-dropdown-item-active` : `${themePrefix}-dropdown-item`
            )}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: t.colors.primary }}
              />
              <span className="capitalize">{t.name}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;