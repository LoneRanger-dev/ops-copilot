import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Section 15.3: `any` is forbidden. Use `unknown` and narrow.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Section 15.9: stdout is the log transport, but only via lib/observability.
      'no-console': 'error',
    },
  },

  /*
   * Section 16.6 — the service-role client bypasses every RLS policy, so its
   * import is restricted to the three sanctioned call sites. The override
   * below re-enables it for exactly those paths.
   */
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/db/admin', '@/lib/db/admin'],
              message:
                'The service-role client bypasses RLS. It is permitted only in ' +
                'lib/jobs/handlers/*, app/api/v1/jobs/process/route.ts, and ' +
                'lib/integrations/servicenow/sync.ts. Use @/lib/db/client instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/lib/jobs/handlers/*.ts',
      'src/app/api/v1/jobs/process/route.ts',
      'src/lib/integrations/servicenow/sync.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },

  // The logger owns the stdout transport; scripts are operator-facing CLIs.
  {
    files: ['src/lib/observability/logger.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // Config and scripts run outside the app bundle.
  {
    files: ['*.config.{ts,mjs,js}', 'scripts/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
];

export default eslintConfig;
