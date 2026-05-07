import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/coverage',
      '**/dist',
      '**/linter',
      '**/node_modules',
      '**/.venv',
      '**/venv',
      '**/env',
      '**/__pycache__',
      '**/cli',
      '**/*.json',
      '**/*.md',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettier,
];
