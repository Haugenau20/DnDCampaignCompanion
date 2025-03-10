// src/test-utils/test-utils.tsx
import React, { FC, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { FirebaseProvider } from '../context/FirebaseContext';
import { NavigationProvider } from '../context/NavigationContext';
import { SearchProvider } from '../context/SearchContext';
import { NPCProvider } from '../context/NPCContext';
import { LocationProvider } from '../context/LocationContext';
import { StoryProvider } from '../context/StoryContext';

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
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