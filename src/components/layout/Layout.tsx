// components/layout/Layout.tsx
import React from 'react';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Navigation />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-4 content">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;