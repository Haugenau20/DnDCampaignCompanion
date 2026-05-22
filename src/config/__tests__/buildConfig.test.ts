// src/config/__tests__/buildConfig.test.ts
//
// Tests for the buildConfig module.
// buildConfig is a plain `as const` object — it has no branching logic and does
// not read from process.env at runtime, so all tests are shape/value assertions.
// Any process.env manipulation is included here for future-proofing if the
// module is ever refactored to support env-driven overrides.

import buildConfig, { BuildConfig } from '../buildConfig';

// ---------------------------------------------------------------------------
// Shape assertions
// ---------------------------------------------------------------------------

describe('buildConfig', () => {
  // -------------------------------------------------------------------------
  // Top-level shape
  // -------------------------------------------------------------------------
  describe('top-level shape', () => {
    test('should export a default object', () => {
      expect(buildConfig).toBeDefined();
      expect(typeof buildConfig).toBe('object');
      expect(buildConfig).not.toBeNull();
    });

    test('should have a "features" property', () => {
      expect(buildConfig).toHaveProperty('features');
    });

    test('should have a "version" property', () => {
      expect(buildConfig).toHaveProperty('version');
    });
  });

  // -------------------------------------------------------------------------
  // Version value
  // -------------------------------------------------------------------------
  describe('version field', () => {
    test('should have version "1.0.0"', () => {
      expect(buildConfig.version).toBe('1.0.0');
    });

    test('should have version as a string', () => {
      expect(typeof buildConfig.version).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // Features object
  // -------------------------------------------------------------------------
  describe('features object', () => {
    test('should have "enableSidebar" property', () => {
      expect(buildConfig.features).toHaveProperty('enableSidebar');
    });

    test('should have "showNPCLegend" property', () => {
      expect(buildConfig.features).toHaveProperty('showNPCLegend');
    });

    test('enableSidebar should be false by default', () => {
      expect(buildConfig.features.enableSidebar).toBe(false);
    });

    test('showNPCLegend should be false by default', () => {
      expect(buildConfig.features.showNPCLegend).toBe(false);
    });

    test('enableSidebar should be a boolean', () => {
      expect(typeof buildConfig.features.enableSidebar).toBe('boolean');
    });

    test('showNPCLegend should be a boolean', () => {
      expect(typeof buildConfig.features.showNPCLegend).toBe('boolean');
    });
  });

  // -------------------------------------------------------------------------
  // Type compatibility — BuildConfig named export
  // -------------------------------------------------------------------------
  describe('BuildConfig type export', () => {
    test('buildConfig should be assignable to BuildConfig type', () => {
      // TypeScript compile-time check — if the assignment compiles, the type is correct
      const config: BuildConfig = buildConfig;
      expect(config).toBe(buildConfig);
    });

    test('BuildConfig features shape matches runtime object', () => {
      const config: BuildConfig = buildConfig;
      expect(Object.keys(config.features)).toEqual(
        expect.arrayContaining(['enableSidebar', 'showNPCLegend'])
      );
    });
  });

  // -------------------------------------------------------------------------
  // Singleton identity — module-level const
  // -------------------------------------------------------------------------
  describe('singleton identity', () => {
    test('importing buildConfig twice returns the same reference', () => {
      // Node module cache ensures the same object is returned on repeated imports.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const second = require('../buildConfig').default;
      expect(second).toBe(buildConfig);
    });

    test('features object is the same reference on repeated access', () => {
      expect(buildConfig.features).toBe(buildConfig.features);
    });
  });
});
