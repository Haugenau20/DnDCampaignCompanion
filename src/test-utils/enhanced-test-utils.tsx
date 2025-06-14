// src/test-utils/enhanced-test-utils.tsx

import React, { FC, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../themes/ThemeContext';
import { FirebaseProvider } from '../context/firebase/FirebaseContext';
import { NavigationProvider } from '../context/NavigationContext';
import { SearchProvider } from '../context/SearchContext';
import { NPCProvider } from '../context/NPCContext';
import { LocationProvider } from '../context/LocationContext';
import { StoryProvider } from '../context/StoryContext';
import { QuestProvider } from '../context/QuestContext';
import { RumorProvider } from '../context/RumorContext';
import { NoteProvider } from '../context/NoteContext';
import { createMockFirebaseContext } from './firebase-test-helpers';

interface TestWrapperProps {
  children: React.ReactNode;
  firebaseOverrides?: any;
  skipProviders?: string[];
}

// Enhanced wrapper that can selectively include providers
const TestWrapper: FC<TestWrapperProps> = ({ 
  children, 
  firebaseOverrides = {},
  skipProviders = []
}) => {
  // Helper to conditionally wrap with provider
  const withProvider = (ProviderComponent: any, children: React.ReactNode, providerName: string) => {
    if (skipProviders.includes(providerName)) {
      return children;
    }
    return <ProviderComponent>{children}</ProviderComponent>;
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ThemeProvider>
        <FirebaseProvider>
          {withProvider(NavigationProvider, 
            withProvider(SearchProvider,
              withProvider(NPCProvider,
                withProvider(LocationProvider,
                  withProvider(QuestProvider,
                    withProvider(RumorProvider,
                      withProvider(StoryProvider,
                        withProvider(NoteProvider, children, 'NoteProvider'),
                        'StoryProvider'
                      ),
                      'RumorProvider'
                    ),
                    'QuestProvider'
                  ),
                  'LocationProvider'
                ),
                'NPCProvider'
              ),
              'SearchProvider'
            ),
            'NavigationProvider'
          )}
        </FirebaseProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Enhanced render function with flexible provider options
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    firebaseOverrides?: any;
    skipProviders?: string[];
  },
) => {
  const { firebaseOverrides, skipProviders, ...renderOptions } = options || {};
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper 
      firebaseOverrides={firebaseOverrides} 
      skipProviders={skipProviders}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Specialized render functions for specific test scenarios
export const renderWithMinimalProviders = (ui: ReactElement, options?: RenderOptions) => {
  return customRender(ui, {
    ...options,
    skipProviders: ['NPCProvider', 'QuestProvider', 'RumorProvider', 'LocationProvider', 'StoryProvider', 'NoteProvider']
  });
};

export const renderWithFirebaseOnly = (ui: ReactElement, options?: RenderOptions) => {
  return customRender(ui, {
    ...options,
    skipProviders: ['NavigationProvider', 'SearchProvider', 'NPCProvider', 'QuestProvider', 'RumorProvider', 'LocationProvider', 'StoryProvider', 'NoteProvider']
  });
};

export const renderWithNPCContext = (ui: ReactElement, options?: RenderOptions) => {
  return customRender(ui, {
    ...options,
    skipProviders: ['QuestProvider', 'RumorProvider', 'LocationProvider', 'StoryProvider', 'NoteProvider']
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };