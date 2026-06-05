// jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    // Resolve bare paths from src/ (mirrors tsconfig.json `baseUrl: "src"`) at runtime
    // without using `modulePaths`, which can disturb ts-jest's per-file compilation isolation.
    '^(app|components|context|features|hooks|pages|services|themes|types|utils|constants)/(.*)$': '<rootDir>/src/$1/$2',
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle all CSS imports (new line added)
    '\\.(css|sass|scss)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.ts',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/index.tsx',
    'src/setupTests.ts',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}'
  ],
  // Configure test coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/setupTests.ts',
    '!src/utils/__dev__/**',
    '!src/test-utils/**',
    '!src/__mocks__/**',
    '!src/themes/definitions/**'
  ],
  coverageThreshold: {
    global: {
      branches: 81,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  // Jest HTML Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'D&D Campaign Companion Test Report',
        outputPath: './test-reports/jest-html-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true,
        theme: 'defaultTheme',
        sort: 'status',
        executionTimeWarningThreshold: 5,
        dateFormat: 'yyyy-mm-dd HH:MM:ss'
      }
    ]
  ]
};

export default config;