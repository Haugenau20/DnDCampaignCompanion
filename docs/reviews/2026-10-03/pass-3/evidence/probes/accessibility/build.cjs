const fs = require('fs');
const path = require('path');
const repo = '/workspace/DnDCampaignCompanion';
const out = '/tmp/pass3-accessibility';
const fromRepo = id => require(path.join(repo, 'node_modules', id));
const webpack = fromRepo('webpack');
const stubs = path.join(out, 'stubs.tsx');
const aliases = Object.fromEntries([
  'shared/hooks/useSearch', 'shared/hooks/useCreateActions', 'shared/context/NavigationContext',
  'shared/context/QuickAddContext', 'features/user-management',
].map(key => [`${key}$`, stubs]));
aliases[path.join(repo, 'src/shared/components/quick-add/useQuickAddCreate.ts')] = stubs;
async function main() {
  const tailwindConfig = require(path.join(repo, 'tailwind.config.js'));
  tailwindConfig.content = [path.join(repo, 'src/**/*.{js,jsx,ts,tsx}'), path.join(out, 'harness.tsx')];
  await new Promise((resolve, reject) => webpack({
    mode: 'development', context: repo, entry: path.join(out, 'harness.tsx'), devtool: false,
    output: { path: out, filename: 'bundle.js' },
    plugins: [new webpack.NormalModuleReplacementPlugin(/(^|\/)useQuickAddCreate$/, stubs)],
    resolve: { extensions: ['.tsx', '.ts', '.js'], modules: [path.join(repo, 'node_modules'), path.join(repo, 'src'), 'node_modules'], alias: aliases },
    module: { rules: [
      { test: /\.tsx?$/, exclude: /node_modules/, use: { loader: path.join(repo, 'node_modules/babel-loader'), options: { babelrc: false, configFile: false, presets: [path.join(repo, 'node_modules/@babel/preset-env'), path.join(repo, 'node_modules/@babel/preset-react'), path.join(repo, 'node_modules/@babel/preset-typescript')] } } },
      { test: /\.css$/, use: [path.join(repo, 'node_modules/style-loader'), path.join(repo, 'node_modules/css-loader'), {
        loader: path.join(repo, 'node_modules/postcss-loader'), options: { postcssOptions: { plugins: [fromRepo('tailwindcss')(tailwindConfig), fromRepo('autoprefixer')()] } },
      }] },
    ] }, optimization: { minimize: false },
  }, (err, stats) => {
    if (err) return reject(err);
    if (stats.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
    console.log(stats.toString({ all: false, timings: true, assets: true })); resolve();
  }));
  fs.writeFileSync(path.join(out, 'styles.css'), '/* Shipping CSS is bundled with the same style-loader/css-loader/postcss-loader import path as the app. */');
  fs.writeFileSync(path.join(out, 'axe.js'), fromRepo('axe-core').source);
  console.log('Prepared actual component bundle and repository CSS; all data/provider/create boundaries are synthetic.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
