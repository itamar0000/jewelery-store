import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

/**
 * Button and button-styled link.
 *
 * CORRECT ELEMENT FOR THE JOB (MASTER_SPECIFICATION section 47): navigation
 * renders `<a>` via next/link, actions render `<button>`. They share a visual
 * treatment but not an element, because a link that is a `<button>` breaks
 * middle-click, "open in new tab" and the screen-reader links list, and a
 * button that is an `<a href="#">` announces itself wrongly and moves the page.
 *
 * The `href` prop selects between them: present means link, absent means
 * button. Every variant keeps the global `:focus-visible` ring from globals.css.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium ' +
  'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  /** The one high-emphasis action in a view. */
  primary: 'bg-foreground text-background hover:bg-foreground/90',
  /** Default for most actions: hairline box on the surface. */
  secondary: 'border border-border-strong bg-card text-foreground hover:bg-muted',
  /** Low emphasis, sits inside dense UI. */
  ghost: 'text-foreground hover:bg-muted',
  /** Text link styled as an action. */
  link: 'text-accent underline underline-offset-4 hover:text-foreground',
} as const;

const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-base',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type AsLink = CommonProps & { href: string };

export function Button(props: AsButton | AsLink) {
  const { children, variant = 'secondary', size = 'md', className } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if ('href' in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { children: _children, variant: _v, size: _s, className: _c, ...rest } = props as AsButton;

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
