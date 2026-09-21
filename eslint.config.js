import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'lib/**', 'coverage/**', 'node_modules/**', 'src/shell/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }]
    }
  },
  { files: ['*.config.js', '*.config.ts', 'apply/**/*.mjs', 'apply/templates/**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  { files: ['apply/**/*.mjs', 'apply/templates/**/*.js'], rules: { 'no-console': 'off', '@typescript-eslint/explicit-function-return-type': 'off' } }
);
