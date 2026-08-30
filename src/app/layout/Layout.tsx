// app/layout/Layout.tsx
import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Navigation from './Navigation';
import GlobalActionButton from 'shared/components/GlobalActionButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header carries the desktop navigation inline; only the mobile strip is a
          row of its own, because one bar cannot hold seven destinations plus
          search at phone widths. */}
      <Header />
      <Navigation variant="mobile" />
        <main className="flex-1 p-4 content">
          {children}
        </main>
      <Footer />

      {/* FloatingUsageIndicator no longer renders here (or anywhere): it
          self-gated to /notes/* routes, but Layout wraps every route, so it
          kept appearing on note pages even after NotePage stopped rendering
          it directly. UsageMeter in the note rail replaces it. The
          component, its barrel export, and its tests are kept -- only the
          render site is gone. */}
      <GlobalActionButton />
    </div>
  );
};

export default Layout;