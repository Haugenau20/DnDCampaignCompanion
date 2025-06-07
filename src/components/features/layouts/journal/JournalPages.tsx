// components/features/layouts/journal/JournalPages.tsx
import React from 'react';

interface JournalPagesProps {
  children: React.ReactNode;
}

/**
 * Container for journal pages that handles the layout of the open book
 */
const JournalPages: React.FC<JournalPagesProps> = ({ children }) => {

  return (
    <div className="w-full flex journal-pages">
      {children}
    </div>
  );
};

export default JournalPages;