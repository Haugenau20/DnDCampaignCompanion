const repo = '/workspace/DnDCampaignCompanion';
module.exports = {
  rootDir: repo,
  roots: ['/tmp/pass3-architecture'],
  testEnvironment: repo + '/node_modules/jest-environment-jsdom',
  testMatch: ['**/theme-storage.test.cjs'],
  transform: { '^.+\\.tsx?$': [repo + '/node_modules/ts-jest', { tsconfig: repo + '/tsconfig.json', diagnostics: false }] },
  moduleNameMapper: {
    '^(core|shared)/(.*)$': repo + '/src/$1/$2',
    '\\.(css|scss)$': '/tmp/pass3-architecture/empty.cjs'
  },
  reporters: ['default'],
  cacheDirectory: '/tmp/pass3-architecture/jest-cache',
  maxWorkers: 1
};
