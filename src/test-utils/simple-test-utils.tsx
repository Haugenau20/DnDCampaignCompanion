// src/test-utils/simple-test-utils.tsx

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Simple test wrapper without Firebase contexts that cause initialization issues
const SimpleTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {children}
    </BrowserRouter>
  );
};

// Simple render function for basic component testing
const simpleRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: SimpleTestWrapper, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { simpleRender as render };