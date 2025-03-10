// components/layout/Layout.tsx
import React from 'react';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Navigation from './Navigation';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  return (
    <div className={clsx(
      'min-h-screen flex flex-col',
      // Body class is set in ThemeContext, no need to add it here
    )}>
      <Header />
      <Navigation />
      <div className="flex-1 flex">
        <Sidebar />
        <main className={clsx(
          "flex-1 p-4",
          `${themePrefix}-content`
        )}>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;