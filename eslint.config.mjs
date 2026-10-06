// eslint.config.mjs
//
// The app's lint rules, as an ESLint flat config.
//
// Until T115 the repo extended Create React App's `react-app` and
// `react-app/jest` configs, kept after the move to Vite (T059). Those require
// ESLint 8, so their rules are written out here instead: the same rules at
// the same levels, on the same files. Where a plugin has since renamed or
// dropped a rule, the comment beside it says so. CRA's configs kept almost
// everything at "warn"; `npm run lint` allows zero warnings, so in app code a
// warning fails the gate just as an error does.
//
// Two scripts read this file: `npm run lint` (app code, zero warnings, plus
// `import/no-cycle` on the command line) and `npm run lint:tests` (the test
// files, against a per-file baseline in scripts/test-lint-baseline.json).

import confusingBrowserGlobals from "confusing-browser-globals";
import importPlugin from "eslint-plugin-import";
import jestPlugin from "eslint-plugin-jest";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import testingLibraryPlugin from "eslint-plugin-testing-library";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Code-splitting the CRA way; `import()` is the only form the bundler splits on. */
const USE_DYNAMIC_IMPORT = "Please use import() instead.";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        warnOnUnsupportedTypeScriptVersion: true,
      },
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2015,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      import: importPlugin,
      "jsx-a11y": jsxA11yPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "detect" },
      // `import/no-cycle` has to resolve bare `baseUrl` imports
      // (`core/types/common`) to follow an edge, hence `src` as a module root.
      "import/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
      "import/resolver": {
        node: {
          moduleDirectory: ["node_modules", "src"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      // Possible problems and best practices.
      "array-callback-return": "warn",
      "dot-location": ["warn", "property"],
      eqeqeq: ["warn", "smart"],
      "getter-return": "warn",
      "new-parens": "warn",
      "no-caller": "warn",
      "no-cond-assign": ["warn", "except-parens"],
      "no-const-assign": "warn",
      "no-control-regex": "warn",
      "no-delete-var": "warn",
      "no-dupe-args": "warn",
      "no-dupe-keys": "warn",
      "no-duplicate-case": "warn",
      "no-empty-character-class": "warn",
      "no-empty-pattern": "warn",
      "no-eval": "warn",
      "no-ex-assign": "warn",
      "no-extend-native": "warn",
      "no-extra-bind": "warn",
      "no-extra-label": "warn",
      "no-fallthrough": "warn",
      "no-func-assign": "warn",
      "no-global-assign": "warn",
      "no-implied-eval": "warn",
      "no-invalid-regexp": "warn",
      "no-iterator": "warn",
      "no-label-var": "warn",
      "no-labels": ["warn", { allowLoop: true, allowSwitch: false }],
      "no-lone-blocks": "warn",
      "no-loop-func": "warn",
      "no-mixed-operators": [
        "warn",
        {
          groups: [
            ["&", "|", "^", "~", "<<", ">>", ">>>"],
            ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
            ["&&", "||"],
            ["in", "instanceof"],
          ],
          allowSamePrecedence: false,
        },
      ],
      "no-multi-str": "warn",
      // CRA's `no-new-symbol`, which ESLint 9 deprecates for this.
      "no-new-native-nonconstructor": "warn",
      "no-new-func": "warn",
      "no-new-wrappers": "warn",
      "no-obj-calls": "warn",
      // CRA's `no-new-object`, which ESLint 9 deprecates for this.
      "no-object-constructor": "warn",
      "no-octal": "warn",
      "no-octal-escape": "warn",
      "no-regex-spaces": "warn",
      "no-restricted-globals": ["error", ...confusingBrowserGlobals],
      "no-restricted-properties": [
        "error",
        { object: "require", property: "ensure", message: USE_DYNAMIC_IMPORT },
        { object: "System", property: "import", message: USE_DYNAMIC_IMPORT },
      ],
      "no-restricted-syntax": ["warn", "WithStatement"],
      "no-script-url": "warn",
      "no-self-assign": "warn",
      "no-self-compare": "warn",
      "no-sequences": "warn",
      "no-shadow-restricted-names": "warn",
      "no-sparse-arrays": "warn",
      "no-template-curly-in-string": "warn",
      "no-this-before-super": "warn",
      "no-throw-literal": "warn",
      "no-unreachable": "warn",
      "no-unsafe-negation": "warn",
      "no-unused-labels": "warn",
      // ESLint 9 turned `enforceForClassMembers` on by default; it was off under 8.
      "no-useless-computed-key": ["warn", { enforceForClassMembers: false }],
      "no-useless-concat": "warn",
      "no-useless-escape": "warn",
      "no-useless-rename": [
        "warn",
        { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false },
      ],
      "no-whitespace-before-property": "warn",
      "no-with": "warn",
      "require-yield": "warn",
      "rest-spread-spacing": ["warn", "never"],
      strict: ["warn", "never"],
      "unicode-bom": ["warn", "never"],
      "use-isnan": "warn",
      "valid-typeof": "warn",

      // TypeScript: the compiler already covers `default-case` (via
      // `noFallthroughCasesInSwitch`), `no-dupe-class-members` and `no-undef`;
      // the rest swap a core rule for its type-aware twin.
      "@typescript-eslint/consistent-type-assertions": "warn",
      "@typescript-eslint/no-array-constructor": "warn",
      "@typescript-eslint/no-redeclare": "warn",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
      // `caughtErrors: "none"` was the default under ESLint 8; ESLint 9 and
      // typescript-eslint 8 flipped it to "all", which would newly flag every
      // `catch (error)` that does not read `error`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "none", ignoreRestSiblings: true, caughtErrors: "none" },
      ],
      "@typescript-eslint/no-use-before-define": [
        "warn",
        { functions: false, classes: false, variables: false, typedefs: false },
      ],
      "@typescript-eslint/no-useless-constructor": "warn",

      // Imports.
      "import/first": "error",
      "import/no-amd": "error",
      "import/no-anonymous-default-export": "warn",
      "import/no-webpack-loader-syntax": "error",

      // React.
      "react/forbid-foreign-prop-types": ["warn", { allowInPropTypes: true }],
      "react/jsx-no-comment-textnodes": "warn",
      "react/jsx-no-duplicate-props": "warn",
      "react/jsx-no-target-blank": "warn",
      "react/jsx-no-undef": "error",
      "react/jsx-pascal-case": ["warn", { allowAllCaps: true, ignore: [] }],
      "react/jsx-uses-react": "warn",
      "react/jsx-uses-vars": "warn",
      "react/no-danger-with-children": "warn",
      "react/no-direct-mutation-state": "warn",
      "react/no-is-mounted": "warn",
      "react/no-typos": "error",
      "react/require-render-return": "error",
      "react/style-prop-object": "warn",
      // Only the two classic hooks rules: the plugin's React Compiler rules
      // are new since CRA and not part of this port.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",

      // Accessibility.
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/anchor-is-valid": ["warn", { aspects: ["noHref", "invalidHref"] }],
      "jsx-a11y/aria-activedescendant-has-tabindex": "warn",
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-role": ["warn", { ignoreNonDOM: true }],
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/iframe-has-title": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-distracting-elements": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "jsx-a11y/scope": "warn",
    },
  },
  {
    // The test files `react-app/jest` matched. `setupTests.ts` and
    // `src/test-utils/` are not among them, as before.
    files: ["**/__tests__/**/*", "**/*.{spec,test}.*"],
    plugins: {
      jest: jestPlugin,
      "testing-library": testingLibraryPlugin,
    },
    rules: {
      "jest/no-conditional-expect": "error",
      "jest/no-identical-title": "error",
      "jest/no-interpolation-in-snapshots": "error",
      "jest/no-jasmine-globals": "error",
      // CRA's `jest/no-jest-import` is gone from the plugin: Jest 27 stopped
      // shipping the `jest` module it guarded against.
      "jest/no-mocks-import": "error",
      "jest/valid-describe-callback": "error",
      "jest/valid-expect": "error",
      "jest/valid-expect-in-promise": "error",
      "jest/valid-title": "warn",

      // Plugin v7 names; CRA's were `await-async-query`,
      // `no-await-sync-query` and `no-render-in-setup`. Its
      // `no-wait-for-empty-callback` is gone from the plugin.
      "testing-library/await-async-queries": "error",
      "testing-library/await-async-utils": "error",
      "testing-library/no-await-sync-queries": "error",
      "testing-library/no-container": "error",
      "testing-library/no-debugging-utils": "error",
      "testing-library/no-dom-import": ["error", "react"],
      "testing-library/no-node-access": "error",
      "testing-library/no-promise-in-fire-event": "error",
      "testing-library/no-render-in-lifecycle": "error",
      "testing-library/no-unnecessary-act": "error",
      "testing-library/no-wait-for-multiple-assertions": "error",
      "testing-library/no-wait-for-side-effects": "error",
      "testing-library/no-wait-for-snapshot": "error",
      "testing-library/prefer-find-by": "error",
      "testing-library/prefer-presence-queries": "error",
      "testing-library/prefer-query-by-disappearance": "error",
      "testing-library/prefer-screen-queries": "error",
      "testing-library/render-result-naming-convention": "error",
    },
  },
];
