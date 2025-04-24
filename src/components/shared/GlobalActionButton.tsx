// components/features/dashboard/GlobalActionButton.tsx
import React, { useState } from 'react';
import { useTheme } from '../../themes/ThemeContext';
import { useNavigation } from '../../context/NavigationContext';
import { Plus, BookOpen, User, Scroll, MessageSquare, MapPin, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * GlobalActionButton component that provides a floating action button for creating content
 */
const GlobalActionButton: React.FC = () => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;
  
  // State for open/closed
  const [isOpen, setIsOpen] = useState(false);
  
  // Navigation actions
  const actions = [
    {
      label: 'New Location',
      icon: <MapPin className="w-5 h-5" />,
      onClick: () => navigateToPage('/locations/create')
    },
    {
      label: 'New NPC',
      icon: <User className="w-5 h-5" />,
      onClick: () => navigateToPage('/npcs/create')
    },
    {
      label: 'New Rumor',
      icon: <MessageSquare className="w-5 h-5" />,
      onClick: () => navigateToPage('/rumors/create')
    },
    {
      label: 'New Quest',
      icon: <Scroll className="w-5 h-5" />,
      onClick: () => navigateToPage('/quests/create')
    },
    {
      label: 'New Chapter',
      icon: <BookOpen className="w-5 h-5" />,
      onClick: () => navigateToPage('/story/chapters/create')
    }
  ];
  
  // Toggle open/closed
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle action click
  const handleActionClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };
  
  return (
    <div className="fixed right-6 bottom-6 z-40">
      {/* Action menu */}
      {isOpen && (
        <div className="mb-4 flex flex-col-reverse gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action.onClick)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all duration-200",
                `${themePrefix}-button-primary`,
                "animate-fadeIn"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Main action button */}
      <button
        onClick={toggleOpen}
        className={clsx(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-500",
          `${themePrefix}-button-primary`,
          isOpen && "transform rotate-90 duration-500"
        )}
        aria-label={isOpen ? "Close action menu" : "Open action menu"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default GlobalActionButton;