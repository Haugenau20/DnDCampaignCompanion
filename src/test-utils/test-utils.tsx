// src/test-utils/test-utils.tsx
import React, { FC, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../core/themes/ThemeContext';
import { FirebaseProvider } from '@/features/user-management/auth/context/FirebaseContext';
import { NavigationProvider } from 'shared/context/NavigationContext';
import { SearchProvider } from 'shared/context/SearchContext';
import { NPCProvider } from 'features/campaign-entities';
import { LocationProvider } from 'features/campaign-entities';
import { StoryProvider } from '@/features/storytelling';

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ThemeProvider>
        <FirebaseProvider>
          <NavigationProvider>
            <SearchProvider>
              <NPCProvider>
                <LocationProvider>
                  <StoryProvider>
                    {children}
                  </StoryProvider>
                </LocationProvider>
              </NPCProvider>
            </SearchProvider>
          </NavigationProvider>
        </FirebaseProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };