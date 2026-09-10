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
    '^(app|components|context|core|features|hooks|pages|services|shared|themes|types|utils|constants)/(.*)$': '<rootDir>/src/$1/$2',
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
    '^.+\\.tsx?$': 'ts-jest',
    // `react-markdown` and its entire unified/remark/micromark tree ship ESM
    // only (66 packages, `"type": "module"` in each). ts-jest handles our own
    // TypeScript; these need a JS transform, and `transformIgnorePatterns`
    // below is what lets them reach it at all.
    '^.+\\.m?jsx?$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }],
  },
  /*
    node_modules is not transformed by default, which is right for every
    dependency this project had before Phase 9. The markdown parser is the
    first ESM-only one, so its tree is allow-listed back in.

    Written as prefixes rather than the 66 exact names: the tree is one
    ecosystem (unified) whose packages are versioned together, so a patch bump
    that adds `micromark-util-something-new` should not fail the suite. The
    cost of the wildcards is that a *different* ESM dependency arriving under
    one of these prefixes would be silently transformed too — acceptable, since
    transforming a CJS package is a no-op.
  */
  transformIgnorePatterns: [
    `/node_modules/(?!(${[
      'react-markdown',
      'remark-.*',
      'micromark.*',
      'mdast-util-.*',
      'hast-util-.*',
      'unist-util-.*',
      'unified',
      'vfile.*',
      'character-entities.*',
      'character-reference-invalid',
      'comma-separated-tokens',
      'space-separated-tokens',
      'decode-named-character-reference',
      'estree-util-is-identifier-name',
      'html-url-attributes',
      'is-alphabetical',
      'is-alphanumerical',
      'is-decimal',
      'is-hexadecimal',
      'parse-entities',
      'stringify-entities',
      'property-information',
      'longest-streak',
      'trim-lines',
      // Nested: resolves at node_modules/unified/node_modules/is-plain-obj,
      // which the first-level walk missed and the suite found immediately.
      'is-plain-obj',
      'devlop',
      'zwitch',
      'trough',
      'bail',
      'ccount',
      'escape-string-regexp',
      '@ungap/structured-clone',
    ].join('|')})/)`,
  ],
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
    '!src/core/themes/definitions/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
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