// components/features/layouts/journal/JournalPages.tsx
import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import clsx from 'clsx';

interface JournalPagesProps {
  children: React.ReactNode;
}

/**
 * Container for journal pages that handles the layout of the open book
 */
const JournalPages: React.FC<JournalPagesProps> = ({ children }) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className={clsx(
      "w-full flex",
      `${themePrefix}-journal-pages`
    )}>
      {children}
    </div>
  );
};

export default JournalPages;