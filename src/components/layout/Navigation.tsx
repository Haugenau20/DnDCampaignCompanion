// components/layout/Navigation.tsx
import React from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import Typography from '../core/Typography';
import { Book, Scroll, Users, MapPin, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import Button from '../core/Button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

/**
 * Main navigation component for the application
 * Provides navigation links and highlights active routes
 */
const Navigation: React.FC = () => {
  const { shouldHighlightPath, navigateToPage } = useNavigation();

  const navItems: NavItem[] = [
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
    }
  ];

  return (
    <nav className="navigation">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActive = shouldHighlightPath(item.path);
              
              return (
                <Button
                  variant='ghost'
                  onClick={() => navigateToPage(item.path)}
                  startIcon={item.icon}
                  className={clsx(
                  'flex items-center space-x-2 px-3 py-2 rounded-md transition-colors',
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

          {/* Mobile Navigation */}
          <div className="flex md:hidden">
            {navItems.map((item) => {
              const isActive = shouldHighlightPath(item.path);
              
              return (
                <div>
                  <Button
                    variant='ghost'
                    onClick={() => navigateToPage(item.path)}
                    startIcon={item.icon}
                    iconPosition='top'
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;