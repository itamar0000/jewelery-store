/**
 * Storefront navigation UI state.
 *
 * WHY THIS IS A SEPARATE, PURE MODULE. The header owns four pieces of
 * interactive state - the open mega menu, the mobile drawer, the drawer's
 * expanded group, and the search overlay - and they constrain each other. Left
 * inside the component as four `useState` calls, those constraints become
 * scattered `setX(false)` calls that drift apart, and testing them requires a
 * DOM environment the project deliberately does not have (vitest runs in node;
 * see vitest.config.ts).
 *
 * Modelled as a reducer instead, the rules are stated once and are directly
 * testable as pure functions. The components call `useReducer` and render.
 *
 * THE CENTRAL INVARIANT: at most one overlay surface is open at a time. A mega
 * menu, the mobile drawer and the search overlay all claim the viewport and the
 * user's focus, so opening any one of them closes the others. Every transition
 * below preserves that.
 */

export interface MenuState {
  /** `id` of the open mega menu, or `null`. */
  readonly openMegaMenu: string | null;
  readonly mobileMenuOpen: boolean;
  /** `id` of the expanded group inside the mobile drawer, or `null`. */
  readonly mobileExpandedGroup: string | null;
  readonly searchOpen: boolean;
}

export const INITIAL_MENU_STATE: MenuState = {
  openMegaMenu: null,
  mobileMenuOpen: false,
  mobileExpandedGroup: null,
  searchOpen: false,
};

export type MenuAction =
  | { type: 'OPEN_MEGA_MENU'; id: string }
  | { type: 'CLOSE_MEGA_MENU' }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'CLOSE_MOBILE_MENU' }
  | { type: 'TOGGLE_MOBILE_GROUP'; id: string }
  | { type: 'OPEN_SEARCH' }
  | { type: 'CLOSE_SEARCH' }
  /** Escape key, or a route change. Closes every transient surface at once. */
  | { type: 'DISMISS_ALL' };

export function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'OPEN_MEGA_MENU':
      // Supersedes BOTH other surfaces. Closing the mobile drawer here looks
      // redundant - a mega menu is desktop-only and the drawer is mobile-only,
      // so a viewport can never show both - but relying on that means the
      // invariant is enforced by CSS breakpoints rather than by this reducer,
      // and it breaks the moment a drawer is left open across a resize.
      return { ...state, openMegaMenu: action.id, searchOpen: false, mobileMenuOpen: false };

    case 'CLOSE_MEGA_MENU':
      return { ...state, openMegaMenu: null };

    case 'TOGGLE_MOBILE_MENU': {
      const opening = !state.mobileMenuOpen;
      return {
        ...state,
        mobileMenuOpen: opening,
        // Collapse the accordion on close, so reopening starts clean rather
        // than restoring a group the user has forgotten they expanded.
        mobileExpandedGroup: opening ? state.mobileExpandedGroup : null,
        searchOpen: false,
        openMegaMenu: null,
      };
    }

    case 'CLOSE_MOBILE_MENU':
      return { ...state, mobileMenuOpen: false, mobileExpandedGroup: null };

    case 'TOGGLE_MOBILE_GROUP':
      // Accordion, not independent disclosures: one group at a time keeps the
      // drawer scannable (MASTER_SPECIFICATION section 7).
      return {
        ...state,
        mobileExpandedGroup: state.mobileExpandedGroup === action.id ? null : action.id,
      };

    case 'OPEN_SEARCH':
      return { ...state, searchOpen: true, openMegaMenu: null, mobileMenuOpen: false };

    case 'CLOSE_SEARCH':
      return { ...state, searchOpen: false };

    case 'DISMISS_ALL':
      return INITIAL_MENU_STATE;
  }
}

/**
 * Whether any surface is holding the viewport.
 *
 * The header uses this to lock body scroll. Mega menus are excluded on purpose:
 * they are desktop hover/focus surfaces that do not cover the page, and locking
 * scroll under them would be a bug, not a feature.
 */
export function isScrollLocked(state: MenuState): boolean {
  return state.mobileMenuOpen || state.searchOpen;
}
