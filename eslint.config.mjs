import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/*
 * RTL SAFEGUARD
 *
 * MASTER_SPECIFICATION section 49 and ARCHITECTURE section 3.2: the entire
 * customer-facing experience is right-to-left, and directional styling must use
 * CSS logical properties so it mirrors automatically. Physical utilities do
 * not mirror - `ml-4` is a left margin in Hebrew exactly as it is in English -
 * and every one of them is a layout bug that only shows up when someone looks
 * at the page.
 *
 * Enforced by tooling rather than by discipline, because "remember to use
 * ms- instead of ml-" is not a thing a team reliably remembers.
 *
 *   ml-*      ->  ms-*            (margin-inline-start)
 *   mr-*      ->  me-*            (margin-inline-end)
 *   pl-*      ->  ps-*
 *   pr-*      ->  pe-*
 *   left-*    ->  start-*
 *   right-*   ->  end-*
 *   text-left ->  text-start
 *   text-right->  text-end
 *   border-l  ->  border-s
 *   border-r  ->  border-e
 *
 * Boundary characters cover Tailwind variants and the important modifier, so
 * `md:ml-4`, `hover:pl-2` and `!mr-2` are caught too. The negative lookaheads
 * keep `border-red-500`, `border-lime-500` and `place-items-*` out of it.
 *
 * Scope is deliberately narrow: it lints markup only, and only in
 * customer-facing code. Two known gaps, both accepted rather than solved with
 * a bespoke plugin:
 *   - class names assembled inside a helper call (`cn('ml-4')`) are not seen;
 *   - `src/app/(admin)` is exempt, because section 49 governs the customer
 *     experience and admin is internal (ARCHITECTURE section 3.2).
 */
const PHYSICAL_DIRECTION_UTILITIES =
  '(?:^|[\\s:!])-?(?:m[lr]|p[lr]|left|right)-' +
  '|(?:^|[\\s:!])text-(?:left|right)(?![a-z-])' +
  '|(?:^|[\\s:!])border-[lr](?![a-z])';

const RTL_MESSAGE =
  'Physical direction utility in RTL code. Use the logical equivalent: ' +
  'ms-/me- for ml-/mr-, ps-/pe- for pl-/pr-, start-/end- for left-/right-, ' +
  'text-start/text-end, border-s/border-e. See MASTER_SPECIFICATION section 49.';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'coverage/**',
      'next-env.d.ts',
      // Prisma's generated client. Not ours to lint, and regenerated on every
      // install.
      'src/generated/**',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      // The specification forbids untyped escape hatches (ARCHITECTURE
      // section 1). `any` must be an explicit, justified decision, not an
      // accident.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['src/app/(admin)/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${PHYSICAL_DIRECTION_UTILITIES}/]`,
          message: RTL_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${PHYSICAL_DIRECTION_UTILITIES}/]`,
          message: RTL_MESSAGE,
        },
      ],
    },
  },

  // Prettier owns formatting; disable every stylistic rule that would conflict.
  prettierConfig,
];

export default eslintConfig;
