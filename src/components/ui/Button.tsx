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
 * PILLS (D4D.26). The atelier's actions are rounded the whole way, like a
 * jeweller's label tag: the only fully round shape on the page besides the
 * colour swatches, so an action is recognisable as one at a glance. Medium
 * weight, not bold: the serif headings carry the emphasis.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium ' +
  'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  /**
   * THE ONE HIGH-EMPHASIS ACTION IN A VIEW: a green pill with ivory type. A
   * view with two of these has not decided what it wants the visitor to do.
   */
  primary: 'bg-stamp text-stamp-foreground hover:bg-stamp-hover',
  /**
   * Default for most actions: an outlined pill in the colour of its surface.
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
  secondary: 'border border-current text-inherit hover:bg-foreground/5',
  /**
   * The primary action ON THE GREEN FIELD: an ivory pill with green type, the
   * field's colours reversed. Only for the field band.
   */
  inverse: 'bg-field-foreground text-field hover:bg-field-foreground/90',
  /** Low emphasis, sits inside dense UI. Inherits, for the same reason. */
  ghost: 'text-inherit hover:bg-muted',
  /** Text link styled as an action. */
  link: 'text-accent underline underline-offset-[0.35em] decoration-border-strong hover:decoration-accent',
} as const;

const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-7 text-[0.9375rem]',
  lg: 'h-14 px-9 text-base',
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
