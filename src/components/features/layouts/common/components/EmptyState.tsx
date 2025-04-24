// components/features/layouts/common/components/EmptyState.tsx
import React, { ReactNode } from 'react';
import Button from '../../../../core/Button';
import clsx from 'clsx';

interface EmptyStateProps {
  icon: ReactNode;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Reusable empty state component showing when no data is available
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  className
}) => {

  return (
    <div className={clsx(
      "text-center py-4 journal-empty",
      className
    )}>
      <div className="w-8 h-8 mx-auto mb-2 opacity-50 flex items-center justify-center">
        {icon}
      </div>
      
      {title && (
        <p className="text-base font-medium mb-1 typography">
          {title}
        </p>
      )}
      
      <p className="text-sm italic typography-secondary">
        {message}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAction} 
          className="mt-3"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;