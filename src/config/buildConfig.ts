// src/config/buildConfig.ts
const buildConfig = {
  features: {
    enableSidebar: false,
    showNPCLegend: false,  // Added this feature flag
  },
  // Add other build configurations here
  version: '1.0.0',
} as const;

export type BuildConfig = typeof buildConfig;
export default buildConfig;