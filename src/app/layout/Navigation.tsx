// app/layout/Navigation.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from 'shared/hooks/useNavigation';
import { usePopoverKeys } from 'shared/hooks/usePopoverKeys';
import Typography from 'core/components/Typography';
import { Home, Book, Scroll, Users, MapPin, MessageSquare, StickyNote, ChevronDown } from 'lucide-react';
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

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreContainerRef = useRef<HTMLDivElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  const closeMore = useCallback(() => setIsMoreOpen(false), []);

  usePopoverKeys({
    isOpen: isMoreOpen,
    panelRef: morePanelRef,
    triggerRef: moreTriggerRef,
    onClose: closeMore,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreContainerRef.current &&
        !moreContainerRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // The last two destinations are the ones that fold below `nav` -- see the
  // `nav:` breakpoint comment in tailwind.config.js for why 1024px cannot
  // express this. `navItems` stays the single source of truth: both lists
  // below are slices of it, never a second hardcoded set of destinations.
  const inlineItems = navItems.slice(0, -2);
  const overflowItems = navItems.slice(-2);

  /**
   * Renders one inline nav destination as a button, optionally appending
   * classes -- used to add `hidden nav:block` to the two items that fold
   * into the More menu below the `nav` breakpoint, without duplicating the
   * button markup or the active-state logic.
   */
  const renderNavButton = (item: NavItem, extraClassName?: string) => {
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
            : `navigation-item`,
          extraClassName
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
  };

  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main">
      {inlineItems.map((item) => renderNavButton(item))}
      {overflowItems.map((item) => renderNavButton(item, 'hidden nav:block'))}

      {/* `nav:hidden` lives on this wrapper, not the button: at and above the
          `nav` breakpoint the button itself used to go `display:none` while
          this `div.relative` stayed a flex item, costing dead `gap-1 lg:gap-2`
          space in the nav row and leaving an open panel rendered (just
          invisible) if the viewport widened past `nav` while it was open.
          Hiding the wrapper removes it from the flex layout entirely and
          takes the panel with it. */}
      <div className="relative nav:hidden" ref={moreContainerRef}>
        <button
          ref={moreTriggerRef}
          type="button"
          onClick={() => setIsMoreOpen((previous) => !previous)}
          aria-haspopup="menu"
          aria-expanded={isMoreOpen}
          className={clsx(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md whitespace-nowrap transition-colors',
            isMoreOpen ? 'dropdown-item-active' : 'button-ghost'
          )}
        >
          <Typography variant="body-sm">More</Typography>
          <ChevronDown size={14} className="flex-shrink-0" />
        </button>

        {isMoreOpen && (
          <div
            ref={morePanelRef}
            role="menu"
            aria-label="More destinations"
            className="dropdown absolute right-0 top-full mt-1 rounded-md shadow-lg z-20"
          >
            {overflowItems.map((item) => (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateToPage(item.path);
                  closeMore();
                }}
                className="dropdown-item w-full text-left px-3 py-2 whitespace-nowrap"
              >
                <Typography variant="body-sm">{item.label}</Typography>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
