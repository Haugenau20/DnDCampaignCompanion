// app/layout/Navigation.tsx
import React from 'react';
import { useNavigation } from 'shared/hooks/useNavigation';
import Typography from 'core/components/Typography';
import { Home, Book, Scroll, Users, MapPin, MessageSquare, StickyNote } from 'lucide-react';
import { clsx } from 'clsx';
import Button from 'core/components/Button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const navItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: <Home className="w-5 h-5" />
  },
  {
    label: 'Story',
    path: '/story',
    icon: <Book className="w-5 h-5" />
  },
  {
    label: 'Quests',
    path: '/quests',
    icon: <Scroll className="w-5 h-5" />
  },
  {
    label: 'Rumors',
    path: '/rumors',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    label: 'NPCs',
    path: '/npcs',
    icon: <Users className="w-5 h-5" />
  },
  {
    label: 'Locations',
    path: '/locations',
    icon: <MapPin className="w-5 h-5" />
  },
  {
    label: 'Notes',
    path: '/notes',
    icon: <StickyNote className="w-5 h-5" />
  }
];

export interface NavigationProps {
  /**
   * `inline` renders text-only links sized to sit inside the header bar — this is
   * what removes the second full-height navigation row on desktop. `mobile` keeps
   * the icon-over-label row as its own strip, where a single bar cannot hold seven
   * destinations plus search.
   */
  variant?: 'inline' | 'mobile';
}

/**
 * Main navigation component for the application.
 * Provides navigation links and highlights active routes.
 */
const Navigation: React.FC<NavigationProps> = ({ variant = 'inline' }) => {
  const { shouldHighlightPath, navigateToPage } = useNavigation();

  if (variant === 'mobile') {
    return (
      <nav className="navigation md:hidden" aria-label="Main">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-between overflow-x-auto">
            {navItems.map((item) => {
              const isActive = shouldHighlightPath(item.path);

              return (
                <Button
                  key={item.path}
                  variant='ghost'
                  onClick={() => navigateToPage(item.path)}
                  startIcon={item.icon}
                  iconPosition='top'
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'flex flex-col items-center justify-center flex-1 min-w-0 text-sm',
                    isActive
                      ? `navigation-item-active`
                      : `navigation-item`
                  )}
                >
                  <Typography
                    variant="body-sm"
                    className={`mt-1 ${isActive ? 'font-medium' : ''}`}
                  >
                    {item.label}
                  </Typography>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main">
      {navItems.map((item) => {
        const isActive = shouldHighlightPath(item.path);

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigateToPage(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
              'px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors',
              isActive
                ? `navigation-item-active`
                : `navigation-item`
            )}
          >
            <Typography
              variant="body-sm"
              className={isActive ? 'font-semibold' : undefined}
            >
              {item.label}
            </Typography>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
