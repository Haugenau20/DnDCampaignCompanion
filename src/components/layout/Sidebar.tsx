// src/components/layout/Sidebar.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import StorySidebar from './sidebars/StorySidebar';
import QuestSidebar from './sidebars/QuestSidebar';
import buildConfig from '../../config/buildConfig';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Feature flag check and route checks
  if (!buildConfig.features.enableSidebar || 
      !(pathname.startsWith('/story') || pathname.startsWith('/quests'))) {
    return null;
  }

  const renderSidebarContent = () => {
    if (pathname.startsWith('/story')) {
      return <StorySidebar />;
    }
    
    if (pathname.startsWith('/quests')) {
      return <QuestSidebar />;
    }
    
    return null;
  };

  return (
    <aside className={clsx(
      "w-64 h-screen sticky top-0 overflow-y-auto hidden md:block",
      `${themePrefix}-card border-r`,
      `border-${themePrefix}-card-border`
    )}>
      {renderSidebarContent()}
    </aside>
  );
};

export default Sidebar;