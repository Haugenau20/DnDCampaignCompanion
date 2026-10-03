module.exports = {
  rootDir: '/workspace/DnDCampaignCompanion',
  roots: ['/tmp/pass2-react'],
  testMatch: ['**/*.test.js'],
  testEnvironment: '/workspace/DnDCampaignCompanion/node_modules/jest-environment-jsdom',
  moduleNameMapper: {
    '^(app|core|features|pages|shared|utils|types)/(.*)$': '<rootDir>/src/$1/$2',
    '\\.(css|sass|scss)$': '/workspace/DnDCampaignCompanion/node_modules/identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['/workspace/DnDCampaignCompanion/node_modules/ts-jest', {
      tsconfig: '/workspace/DnDCampaignCompanion/tsconfig.json',
      diagnostics: false,
    }],
    '^.+\\.jsx?$': ['/workspace/DnDCampaignCompanion/node_modules/babel-jest', {
      presets: [['/workspace/DnDCampaignCompanion/node_modules/@babel/preset-env', {targets: {node: 'current'}}]],
    }],
  },
  reporters: ['default'],
  cacheDirectory: '/tmp/pass2-react/jest-cache',
};
