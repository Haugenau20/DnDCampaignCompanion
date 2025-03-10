import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import Typography from '../core/Typography';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={clsx(`flex items-center space-x-2 py-2`, className)}
    >
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            to="/"
            className={clsx(
              "hover:opacity-80 transition-colors",
              `${themePrefix}-typography-secondary`
            )}
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center">
              <ChevronRight className={clsx("w-4 h-4 mx-2", `${themePrefix}-typography-secondary`)} />
              {isLast ? (
                <Typography
                  variant="body-sm"
                  color="primary"
                  className="font-medium"
                  aria-current="page"
                >
                  {item.label}
                </Typography>
              ) : (
                <Link
                  to={item.href || '#'}
                  className={clsx(
                    "transition-colors hover:opacity-80",
                    `${themePrefix}-typography-secondary`
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;