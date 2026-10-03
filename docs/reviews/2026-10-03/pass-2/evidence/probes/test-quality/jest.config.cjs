const repo = '/workspace/DnDCampaignCompanion';
const fs = require('fs');
const ts = require(repo + '/node_modules/typescript');
const holder = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(repo + '/jest.config.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('require', 'module', 'exports', code)(require, holder, holder.exports);
const config = holder.exports.default;
module.exports = {
  ...config,
  rootDir: repo,
  collectCoverage: false,
  coverageThreshold: undefined,
  reporters: ['default'],
  cache: false,
  transform: { ...config.transform, '^.+\\.tsx?$': '/tmp/pass2-tests/field-patch-transformer.cjs' },
};
