// components/features/layouts/common/components/EmptyState.tsx
import React, { ReactNode } from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import clsx from 'clsx';
import Button from '../../../../core/Button';

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
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className={clsx(
      "text-center py-4",
      `${themePrefix}-journal-empty`,
      `${themePrefix}-empty-state`,
      className
    )}>
      <div className="w-8 h-8 mx-auto mb-2 opacity-50 flex items-center justify-center">
        {icon}
      </div>
      
      {title && (
        <p className={clsx(
          "text-base font-medium mb-1", 
          `${themePrefix}-typography`
        )}>
          {title}
        </p>
      )}
      
      <p className={clsx(
        "text-sm italic",
        `${themePrefix}-typography-secondary`
      )}>
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