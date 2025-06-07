// components/layout/Layout.tsx
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Navigation from './Navigation';
import FloatingUsageIndicator from '../features/notes/FloatingUsageIndicator';
import GlobalActionButton from '../shared/GlobalActionButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Navigation />
        <main className="flex-1 p-4 content">
          {children}
        </main>
      <Footer />
      
      {/* Floating usage indicator - only shows on note pages */}
      <FloatingUsageIndicator />
      <GlobalActionButton />
    </div>
  );
};

export default Layout;