import type { ElementType, ReactNode } from 'react';

import { cn } from './cn';

/**
 * Horizontal layout primitive.
 *
 * Every page section centres its content through this component rather than
 * repeating `mx-auto max-w-... px-...`, so the page gutter is defined once. The
 * widths come from the container tokens in src/styles/tokens.css.
 *
 * The gutter grows with the viewport (6 -> 8 -> 12 spacing units). Generous
 * whitespace is part of the documented visual direction
 * (MASTER_SPECIFICATION section 2), and a cramped gutter is the fastest way to
 * lose it.
 */
const WIDTHS = {
  prose: 'max-w-(--container-prose)',
  narrow: 'max-w-(--container-narrow)',
  content: 'max-w-(--container-content)',
  wide: 'max-w-(--container-wide)',
  full: 'max-w-none',
} as const;

export type ContainerWidth = keyof typeof WIDTHS;

export interface ContainerProps {
  children: ReactNode;
  width?: ContainerWidth;
  /** Renders as a different element - `section`, `header`, `footer`, `nav`. */
  as?: ElementType;
  className?: string;
}

export function Container({
  children,
  width = 'content',
  as: Component = 'div',
  className,
}: ContainerProps) {
  return (
    <Component className={cn('mx-auto w-full px-6 md:px-8 xl:px-12', WIDTHS[width], className)}>
      {children}
    </Component>
  );
}
