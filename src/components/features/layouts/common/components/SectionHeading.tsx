// components/features/layouts/common/components/SectionHeading.tsx
import React, { ReactNode } from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import clsx from 'clsx';

interface SectionHeadingProps {
  title: string;
  count?: number;
  loading?: boolean;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Common section heading component used across different layouts
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({
  title,
  count,
  loading = false,
  icon,
  actions,
  className
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className={clsx(
      "flex justify-between items-center mb-3",
      className
    )}>
      <h3 className={clsx(
        "text-lg font-medium flex items-center gap-2",
        `${themePrefix}-journal-heading`,
        `${themePrefix}-heading`
      )}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>
          {title} {(count !== undefined || loading) && (
            <span>({loading ? '...' : count})</span>
          )}
        </span>
      </h3>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default SectionHeading;