import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/**'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Downgrade set-state-in-effect from error to warn — calling setState inside
      // an effect is a legitimate React pattern for syncing derived/external state.
      'react-hooks/set-state-in-effect': 'warn',

      // React Refresh (fast refresh compatibility)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Relax a few strict defaults that are noisy on an existing codebase
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },

  // Test files — allow console.log and looser rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/setupTests.ts', 'src/testUtils.tsx'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
