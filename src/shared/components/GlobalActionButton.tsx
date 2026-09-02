// Updated components/features/dashboard/GlobalActionButton.tsx

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Button from 'core/components/Button';
import clsx from 'clsx';
import { useCreateActions } from 'shared/hooks/useCreateActions';
import type { CreateAction } from 'shared/hooks/useCreateActions';

/**
 * GlobalActionButton component that provides a floating action button for creating content
 */
const GlobalActionButton: React.FC = () => {
  const actions = useCreateActions();

  // State for open/closed
  const [isOpen, setIsOpen] = useState(false);

  // Toggle open/closed
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Run a create action and close the menu afterwards.
   *
   * The five navigating actions run synchronously, and the menu must close
   * in that same click's render pass. The note action is async (it writes
   * the note before navigating to it), so its close waits for that promise.
   * Unconditionally `await`-ing here would defer *every* close by a
   * microtask -- including the synchronous ones -- which is a real, visible
   * behaviour change, not just an implementation detail.
   */
  const handleActionClick = (action: CreateAction) => {
    const result = action.run();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setIsOpen(false));
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed right-6 bottom-6 z-40">
      {/* Action menu */}
      {isOpen && (
        <div className="mb-4 flex flex-col-reverse gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                variant='primary'
                startIcon={<Icon className="w-5 h-5" />}
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200 animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span>{`New ${action.entityLabel}`}</span>
              </Button>
            );
          })}
        </div>
      )}
      
      {/* Main action button */}
      <Button
        variant="primary"
        onClick={toggleOpen}
        className={clsx(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-500",
          isOpen && "transform rotate-90 duration-500"
        )}
        aria-label={isOpen ? "Close action menu" : "Open action menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </Button>
    </div>
  );
};

export default GlobalActionButton;