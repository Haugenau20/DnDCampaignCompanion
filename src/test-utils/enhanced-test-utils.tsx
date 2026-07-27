// src/test-utils/enhanced-test-utils.tsx

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
import { QuestProvider } from 'features/campaign-entities';
import { RumorProvider } from 'features/campaign-entities';
import { NoteProvider } from 'features/collaboration';
import { createMockFirebaseContext } from './firebase-test-helpers';

// `FirebaseProvider` (rendered unconditionally by `TestWrapper` below) calls
// `firebaseServices.auth.getAuth()` from its mount effect, which exercises
// `BaseFirebaseService`'s real constructor. Every other test file in this
// codebase that lets that constructor run for real (e.g. `UserService.test.ts`,
// `AuthService.test.ts`, `CampaignService.test.ts`) mocks all five Firebase
// submodules it touches locally, for two reasons this file needs too:
//
// 1. `firebase/analytics` and `firebase/functions` aren't mocked anywhere in
//    `setupTests.ts` at all, so without a local mock `getAnalytics(app)`
//    reaches the real `@firebase/analytics` implementation and throws
//    "No Firebase App '[DEFAULT]' has been created".
// 2. `setupTests.ts`'s global mocks for `firebase/app`/`firebase/auth`/
//    `firebase/firestore` return `undefined` from `initializeApp`/`getAuth`/
//    `getFirestore` (adequate for tests that only assert on call arguments).
//    `BaseFirebaseService` stores that return value in `ServiceRegistry`, and
//    `ServiceRegistry.get()` uses a truthy check (`if (!service) throw`), so an
//    `undefined` value reads as "never registered" even though `register()` was
//    called — the constructor throws "Service 'app' not found in registry"
//    before assigning `this.app`. Overriding these three locally to return a
//    stub object, matching the shape every other Firebase-service test file
//    already uses, avoids that.
//
// This module is the only consumer of these mocks (nothing outside this file's
// own test imports `enhanced-test-utils`), so overriding them here can't affect
// any other suite.
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({}))
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  connectFirestoreEmulator: jest.fn()
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  connectAuthEmulator: jest.fn()
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn()
}));

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

  // Provider nesting mirrors app/App.tsx: SearchProvider calls useChapterData,
  // useNPCData, useLocationData, useQuests and useRumorData directly in its
  // body, so it must be nested *inside* NPCProvider/LocationProvider/
  // QuestProvider/RumorProvider/StoryProvider (i.e. rendered as their child,
  // not their ancestor) — those providers must already be mounted and
  // supplying context by the time SearchProvider's function body runs.
  // Production puts SearchProvider innermost, just before the routed content;
  // this wrapper must do the same or SearchProvider throws
  // "useX must be used within a XProvider" before any of skipProviders even
  // matters.
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
            withProvider(NPCProvider,
              withProvider(LocationProvider,
                withProvider(QuestProvider,
                  withProvider(RumorProvider,
                    withProvider(StoryProvider,
                      withProvider(NoteProvider,
                        withProvider(SearchProvider, children, 'SearchProvider'),
                        'NoteProvider'
                      ),
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
    // SearchProvider reads useNPCData/useLocationData/useQuests/useRumorData/
    // useChapterData directly, so it must be skipped alongside the providers
    // that supply those — otherwise it throws even though it's not the
    // provider under test here.
    skipProviders: ['NPCProvider', 'QuestProvider', 'RumorProvider', 'LocationProvider', 'StoryProvider', 'NoteProvider', 'SearchProvider']
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
    // Keeping NPCProvider doesn't help SearchProvider: it also needs
    // Location/Quest/Rumor/Story context, all of which are skipped here, so
    // SearchProvider must be skipped too (see renderWithMinimalProviders).
    skipProviders: ['QuestProvider', 'RumorProvider', 'LocationProvider', 'StoryProvider', 'NoteProvider', 'SearchProvider']
  });
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };