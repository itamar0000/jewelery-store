/**
 * Joins class names, dropping falsy entries.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this codebase composes classes by
 * passing an explicit `className` through to a base, and does not rely on
 * later-wins conflict resolution. A four-line helper is the whole requirement.
 *
 * NOTE for the RTL lint rule (eslint.config.mjs): the rule inspects `className`
 * JSX literals, so it cannot see a physical utility hidden inside a `cn(...)`
 * argument. That gap is documented in the config. Keep directional utilities in
 * the JSX where the linter can reach them.
 */
export function cn(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
