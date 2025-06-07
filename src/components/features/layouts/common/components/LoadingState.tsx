// components/features/layouts/common/components/LoadingState.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LoadingStateProps {
  type?: 'list' | 'card' | 'skeleton';
  count?: number;
  height?: string;
  iconOnly?: boolean;
  className?: string;
}

/**
 * Reusable loading state component that can be used across different layouts
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'skeleton',
  count = 3,
  height = 'h-8',
  iconOnly = false,
  className
}) => {

  if (iconOnly) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="w-6 h-6 animate-spin primary" />
      </div>
    );
  }

  if (type === 'skeleton') {
    return (
      <div className={clsx("space-y-2 animate-pulse", className)}>
        {[...Array(count)].map((_, index) => (
          <div 
            key={index}
            className={clsx(
              height,
              "rounded",
              `journal-loading`
            )}
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin primary" />
      <p className={clsx(`primary`)}>Loading...</p>
    </div>
  );
};

export default LoadingState;