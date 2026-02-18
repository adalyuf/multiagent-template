import js from '@eslint/js'
import importX from 'eslint-plugin-import-x'
import reactPlugin from 'eslint-plugin-react'
import globals from 'globals'

export default [
  // Globally ignore generated/non-source paths
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'package-lock.json',
    ],
  },
  js.configs.recommended,
  importX.flatConfigs.recommended,
  {
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.jsx'],
        },
      },
      'import-x/extensions': ['.js', '.jsx'],
    },
    rules: {
      // Catch unused imports and variables (the primary goal of this issue)
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'none',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      }],
      // Catch imports of deleted or non-existent modules
      'import-x/no-unresolved': 'error',
      // Catch named imports that don't exist in the target module
      'import-x/named': 'error',
      // React rules that mark JSX-used vars as "used" so no-unused-vars works correctly
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    // Test files — add vitest globals and relax rules
    files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        // vitest globals (vite.config.js sets globals: true)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      // @testing-library exports are declared in .d.ts files that the node
      // resolver cannot read in a JS-only project, causing false positives.
      'import-x/named': 'off',
    },
  },
]
