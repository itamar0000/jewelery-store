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
/*
 * SQUARE, NOT ROUNDED. Everything in this world is struck, printed or ruled,
 * and none of those processes produce a soft corner. The radius tokens stay in
 * the scale for surfaces that earn one; an action is not one of them.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold ' +
  'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  /**
   * THE ONE HIGH-EMPHASIS ACTION IN A VIEW: a block of ink with the paper
   * colour as its type. It was a saturated red block, which on a page this
   * quiet was the loudest thing on screen and read as a sticker. A view with
   * two of these has not decided what it wants the visitor to do.
   */
  primary:
    'bg-stamp text-stamp-foreground ring-1 ring-stamp-foreground/25 ring-inset hover:bg-stamp-hover',
  /**
   * Default for most actions: a ruled field on the ground it sits on.
   *
   * THE FOREGROUND IS INHERITED, NOT NAMED, and that is load-bearing. It read
   * `text-foreground`, which is bare metal - correct on the trade field and
   * invisible on the pale surfaces half the buttons on this site sit on. An
   * override at the call site cannot fix it either: `cn` is a plain join with
   * no conflict resolution (see ./cn.ts), so both classes ship and source
   * order decides, which is not a decision anyone made.
   *
   * Inheriting means the button takes the colour of the surface it is on, and
   * every surface in this system states its own foreground.
   */
  secondary: 'border border-border-field text-inherit hover:border-accent hover:bg-muted',
  /** Low emphasis, sits inside dense UI. Inherits, for the same reason. */
  ghost: 'text-inherit hover:bg-muted',
  /** Text link styled as an action. */
  link: 'text-accent underline underline-offset-[0.35em] decoration-border-strong hover:decoration-accent',
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

type AsLink = CommonProps & {
  href: string;
  /** next/link's `scroll`: false keeps the page where it is, for in-page state like filters. */
  scroll?: boolean;
};

export function Button(props: AsButton | AsLink) {
  const { children, variant = 'secondary', size = 'md', className } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if ('href' in props && props.href !== undefined) {
    return (
      <Link href={props.href} scroll={props.scroll} className={classes}>
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
