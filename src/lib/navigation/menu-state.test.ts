import { describe, expect, it } from 'vitest';

import {
  INITIAL_MENU_STATE,
  isScrollLocked,
  menuReducer,
  type MenuAction,
  type MenuState,
} from './menu-state';

/**
 * These tests are the reason the navigation state was extracted from the
 * components. Open/close behaviour is the part of a header that actually
 * breaks, and asserting it here means it is checked in a node environment with
 * no DOM, no jsdom dependency and no rendering.
 */
function run(actions: readonly MenuAction[], from: MenuState = INITIAL_MENU_STATE): MenuState {
  return actions.reduce(menuReducer, from);
}

describe('menuReducer', () => {
  describe('mega menus', () => {
    it('opens the requested menu', () => {
      expect(run([{ type: 'OPEN_MEGA_MENU', id: 'rings' }]).openMegaMenu).toBe('rings');
    });

    it('replaces an open menu rather than stacking', () => {
      const state = run([
        { type: 'OPEN_MEGA_MENU', id: 'rings' },
        { type: 'OPEN_MEGA_MENU', id: 'earrings' },
      ]);

      expect(state.openMegaMenu).toBe('earrings');
    });

    it('closes', () => {
      const state = run([{ type: 'OPEN_MEGA_MENU', id: 'rings' }, { type: 'CLOSE_MEGA_MENU' }]);
      expect(state.openMegaMenu).toBeNull();
    });
  });

  describe('mobile drawer', () => {
    it('toggles open and closed', () => {
      const opened = run([{ type: 'TOGGLE_MOBILE_MENU' }]);
      expect(opened.mobileMenuOpen).toBe(true);

      expect(menuReducer(opened, { type: 'TOGGLE_MOBILE_MENU' }).mobileMenuOpen).toBe(false);
    });

    it('collapses the expanded group when it closes, so reopening starts clean', () => {
      const state = run([
        { type: 'TOGGLE_MOBILE_MENU' },
        { type: 'TOGGLE_MOBILE_GROUP', id: 'rings' },
        { type: 'TOGGLE_MOBILE_MENU' },
      ]);

      expect(state.mobileMenuOpen).toBe(false);
      expect(state.mobileExpandedGroup).toBeNull();
    });

    it('expands one group at a time', () => {
      const state = run([
        { type: 'TOGGLE_MOBILE_MENU' },
        { type: 'TOGGLE_MOBILE_GROUP', id: 'rings' },
        { type: 'TOGGLE_MOBILE_GROUP', id: 'necklaces' },
      ]);

      expect(state.mobileExpandedGroup).toBe('necklaces');
    });

    it('collapses a group when it is toggled twice', () => {
      const state = run([
        { type: 'TOGGLE_MOBILE_GROUP', id: 'rings' },
        { type: 'TOGGLE_MOBILE_GROUP', id: 'rings' },
      ]);

      expect(state.mobileExpandedGroup).toBeNull();
    });
  });

  describe('search overlay', () => {
    it('opens and closes', () => {
      expect(run([{ type: 'OPEN_SEARCH' }]).searchOpen).toBe(true);
      expect(run([{ type: 'OPEN_SEARCH' }, { type: 'CLOSE_SEARCH' }]).searchOpen).toBe(false);
    });
  });

  /**
   * The invariant the whole module exists to guarantee. Two overlays open at
   * once means two competing focus targets and a scroll lock owned by nobody.
   */
  describe('mutual exclusion', () => {
    it('closes the mega menu when search opens', () => {
      const state = run([{ type: 'OPEN_MEGA_MENU', id: 'rings' }, { type: 'OPEN_SEARCH' }]);

      expect(state.searchOpen).toBe(true);
      expect(state.openMegaMenu).toBeNull();
    });

    it('closes the mobile drawer when search opens', () => {
      const state = run([{ type: 'TOGGLE_MOBILE_MENU' }, { type: 'OPEN_SEARCH' }]);

      expect(state.searchOpen).toBe(true);
      expect(state.mobileMenuOpen).toBe(false);
    });

    it('closes search when the mobile drawer opens', () => {
      const state = run([{ type: 'OPEN_SEARCH' }, { type: 'TOGGLE_MOBILE_MENU' }]);

      expect(state.mobileMenuOpen).toBe(true);
      expect(state.searchOpen).toBe(false);
    });

    it('closes search when a mega menu opens', () => {
      const state = run([{ type: 'OPEN_SEARCH' }, { type: 'OPEN_MEGA_MENU', id: 'sets' }]);

      expect(state.openMegaMenu).toBe('sets');
      expect(state.searchOpen).toBe(false);
    });

    it('never leaves two surfaces open, whatever the order', () => {
      const actions: MenuAction[] = [
        { type: 'OPEN_MEGA_MENU', id: 'rings' },
        { type: 'OPEN_SEARCH' },
        { type: 'TOGGLE_MOBILE_MENU' },
        { type: 'OPEN_MEGA_MENU', id: 'sets' },
        { type: 'OPEN_SEARCH' },
      ];

      // Every prefix of the sequence must satisfy the invariant, not just the
      // final state.
      for (let length = 1; length <= actions.length; length += 1) {
        const state = run(actions.slice(0, length));
        const open = [state.openMegaMenu !== null, state.mobileMenuOpen, state.searchOpen];

        expect(open.filter(Boolean).length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('DISMISS_ALL', () => {
    it('clears every surface, as a route change must', () => {
      const state = run([
        { type: 'TOGGLE_MOBILE_MENU' },
        { type: 'TOGGLE_MOBILE_GROUP', id: 'rings' },
        { type: 'DISMISS_ALL' },
      ]);

      expect(state).toEqual(INITIAL_MENU_STATE);
    });
  });

  describe('isScrollLocked', () => {
    it('locks for the mobile drawer and for search', () => {
      expect(isScrollLocked(run([{ type: 'TOGGLE_MOBILE_MENU' }]))).toBe(true);
      expect(isScrollLocked(run([{ type: 'OPEN_SEARCH' }]))).toBe(true);
    });

    it('does NOT lock for a mega menu, which does not cover the page', () => {
      expect(isScrollLocked(run([{ type: 'OPEN_MEGA_MENU', id: 'rings' }]))).toBe(false);
    });

    it('does not lock at rest', () => {
      expect(isScrollLocked(INITIAL_MENU_STATE)).toBe(false);
    });
  });
});
