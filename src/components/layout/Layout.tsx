// components/layout/Layout.tsx
import React from 'react';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';
import Navigation from './Navigation';

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
    </div>
  );
};

export default Layout;