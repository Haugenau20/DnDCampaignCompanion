const repo = process.env.REVIEW_REPO || '/workspace/DnDCampaignCompanion';
module.exports = {
  rootDir: repo,
  roots: [__dirname],
  testMatch: [__dirname + '/*.test.js'],
  testEnvironment: repo + '/node_modules/jest-environment-jsdom',
  moduleNameMapper: {
    '^(app|core|features|pages|shared|utils)/(.*)$': repo + '/src/$1/$2',
    '\\.(css|sass|scss)$': repo + '/node_modules/identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': [repo + '/node_modules/ts-jest', { diagnostics: false, tsconfig: repo + '/tsconfig.json' }],
  },
  reporters: ['default'],
  collectCoverage: false,
};
