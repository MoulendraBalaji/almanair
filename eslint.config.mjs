import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

const strict = tseslint.configs.strictTypeChecked;
const stylistic = tseslint.configs.stylisticTypeChecked;

/** Shared restrictions that keep the dependency graph and literals honest. */
const boundaries = {
  rules: {
    'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['react', 'react-dom', '@/features/*', '@/ui/*', '@/infra/*', '@/server/*', '@/app/*'],
          message: 'The domain layer is pure TypeScript: domain and data only.',
        },
      ],
      },
    ],
  },
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      'src/data/generated/**',
      'next-env.d.ts',
      '**/*.mjs',
      '**/*.js',
    ],
  },
  ...strict.map((config) => ({ ...config, files: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'next.config.ts', 'vitest.config.ts', 'middleware.ts'] })),
  ...stylistic.map((config) => ({ ...config, files: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'next.config.ts', 'vitest.config.ts', 'middleware.ts'] })),
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'next.config.ts', 'vitest.config.ts', 'middleware.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { react, jsx: jsxA11y, import: importPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-magic-numbers': ['error', { ignore: [0, 1, -1], ignoreArrayIndexes: true, ignoreNumericLiteralTypes: true, detectObjects: true, enforceConst: true }],
      complexity: ['error', 10],
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true, IIFEs: true }],
      'max-params': ['error', 3],
      'no-restricted-syntax': ['error', { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Never inject HTML.' }],
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
      'react/jsx-key': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/self-closing-comp': 'error',
      'jsx/alt-text': 'error',
      'jsx/anchor-has-content': 'error',
      'jsx/aria-props': 'error',
      'jsx/role-supports-aria-props': 'error',
      'react/button-has-type': 'error',
      'jsx/heading-has-content': 'error',
      'jsx/label-has-associated-control': 'error',
      'jsx/no-autofocus': 'error',
      'import/no-default-export': 'error',
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    ...boundaries,
  },
  {
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/server/*', '@app/*'], message: 'Features never import server code or routes.' }] }],
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/features/*', '@/ui/*', '@/infra/*', '@app/*'], message: 'The server imports retrieval types and itself only.' }] }],
    },
  },
  {
    files: ['src/data/**/*.ts', 'src/config/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'vitest.config.ts', 'next.config.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'react/jsx-no-literals': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: { 'max-lines-per-function': 'off' },
  },
  {
    // Categorical ordinals (severity bands, cost and effort ranks) are labels,
    // not measurements, and are intentionally fixed by the product contract.
    files: ['src/domain/aqi/**/*.ts', 'src/domain/profile/**/*.ts', 'src/domain/recommender/ranking.ts'],
    rules: { '@typescript-eslint/no-magic-numbers': ['error', { ignore: [0, 1, -1, 2, 3, 4, 5], ignoreNumericLiteralTypes: true }] },
  },
  {
    files: ['app/**/page.tsx', 'app/**/layout.tsx', 'app/**/route.ts', 'middleware.ts', 'next.config.ts', 'vitest.config.ts'],
    rules: { 'import/no-default-export': 'off' },
  },
);
