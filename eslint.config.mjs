// Flat ESLint config — correctness-focused: typescript-eslint recommended
// with stylistic noise dialed down, plus the react-hooks rules (the class of
// bug a type checker can't catch). Prettier handles formatting separately.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['out/**', 'release/**', 'node_modules/**', 'scripts/**', 'ios/**', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The codebase predates the linter — keep the signal, drop the noise.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Pre-existing patterns that work at runtime but deserve refactors —
      // kept visible as warnings rather than gating the build.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
)
