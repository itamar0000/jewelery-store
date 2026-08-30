'use client';

import { useId } from 'react';

import { PLACEHOLDER_ATTR } from '@/lib/placeholders';

import { SORT_OPTIONS } from './filter-config';

/**
 * Sort control.
 *
 * PLACEHOLDER (registry id `filters`). Changing the value sorts nothing; the
 * order comes from the fixture array. Phase 3B moves this into the URL
 * alongside the filters.
 *
 * A NATIVE <select>, deliberately. A custom listbox would need roving focus,
 * type-ahead, and its own screen-reader story, and would still be worse on a
 * phone than the platform picker. Section 50 asks for touch-friendly controls -
 * the native control already is one.
 *
 * The label is visually hidden but present: the control sits next to a product
 * count where a visible "Sort by" label would add clutter, but an unlabelled
 * select announces only its current value.
 */
export function SortControl() {
  const id = useId();

  return (
    <div className="flex items-center gap-2" {...PLACEHOLDER_ATTR}>
      <label htmlFor={id} className="sr-only">
        מיון מוצרים
      </label>

      <select
        id={id}
        defaultValue="relevance"
        className="border-border-strong focus:border-accent h-11 rounded-sm border bg-transparent px-3 text-sm outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
