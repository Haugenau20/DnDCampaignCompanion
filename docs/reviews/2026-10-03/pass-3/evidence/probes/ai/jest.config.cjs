const ROOT = process.env.REVIEW_REPO || '/workspace/DnDCampaignCompanion';
module.exports = {
  rootDir: ROOT,
  roots: [ROOT + '/src', '/tmp/pass3-ai'],
  testMatch: ['/tmp/pass3-ai/*.test.js'],
  testEnvironment: ROOT + '/node_modules/jest-environment-jsdom',
  moduleNameMapper: {
    '^(core|features|shared)/(.*)$': ROOT + '/src/$1/$2',
    '^react$': ROOT + '/node_modules/react',
    '^react-dom$': ROOT + '/node_modules/react-dom',
    '^react-router-dom$': require.resolve('react-router-dom', { paths: [ROOT] }),
    '^firebase/firestore$': require.resolve('firebase/firestore', { paths: [ROOT] }),
  },
  transform: { '^.+\\.tsx?$': [ROOT + '/node_modules/ts-jest', { isolatedModules: true, diagnostics: false, tsconfig: { jsx: 'react', esModuleInterop: true, target: 'ES2020', module: 'commonjs' } }] },
  clearMocks: true,
};
