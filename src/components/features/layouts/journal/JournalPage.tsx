// components/features/layouts/journal/JournalPage.tsx
import React from 'react';
import clsx from 'clsx';

interface JournalPageProps {
  children: React.ReactNode;
  side: 'left' | 'right' | 'single';
}

/**
 * Individual journal page component that applies appropriate styling based on side
 */
const JournalPage: React.FC<JournalPageProps> = ({ children, side }) => {

  return (
    <div 
      className={clsx(
        "w-full md:w-1/2 p-4 md:p-6 overflow-y-auto max-h-[80vh] journal-page",
        `journal-page-${side}`,
        // Add appropriate shadows and borders based on side
        side === 'left' && 'border-r md:shadow-inner-right',
        side === 'right' && 'border-l md:shadow-inner-left',
        // Hide scrollbar but allow scrolling
        'hide-scrollbar'
      )}
      style={{
        // Apply different background positions for texture variation
        backgroundPosition: side === 'left' ? 'left center' : 'right center'
      }}
    >
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default JournalPage;