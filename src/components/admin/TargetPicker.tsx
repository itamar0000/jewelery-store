'use client';

import { useState } from 'react';

import type { TargetChoices } from '@/lib/admin/discounts';

import { INPUT, LABEL } from './styles';

/**
 * What a sale or a coupon applies to (D4D.33): the whole site or order, or
 * chosen products, categories or collections. Only the list for the chosen
 * scope is shown and submitted.
 */
export function TargetPicker({
  scopes,
  defaultScope,
  choices,
  selected,
}: {
  scopes: readonly { value: string; label: string }[];
  defaultScope: string;
  choices: TargetChoices;
  selected: { products: string[]; categories: string[]; collections: string[] };
}) {
  const [scope, setScope] = useState(defaultScope);

  return (
    <div>
      <label htmlFor="scope" className={LABEL}>
        על מה חל
      </label>
      <select
        id="scope"
        name="scope"
        value={scope}
        onChange={(event) => setScope(event.target.value)}
        className={`${INPUT} mt-1.5`}
      >
        {scopes.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {scope === 'CATEGORY' && (
        <fieldset className="border-border mt-3 max-h-80 overflow-y-auto border p-3">
          <legend className="px-1 text-sm">
            קטגוריות (קטגוריה ראשית כוללת את כל התת-קטגוריות שלה)
          </legend>
          {choices.categories.map((root) => (
            <div key={root.id} className="mt-2">
              <Check
                name="category"
                id={root.id}
                label={root.nameHe}
                bold
                checked={selected.categories.includes(root.id)}
              />
              <div className="ms-6">
                {root.children.map((child) => (
                  <Check
                    key={child.id}
                    name="category"
                    id={child.id}
                    label={child.nameHe}
                    checked={selected.categories.includes(child.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {scope === 'COLLECTION' && (
        <fieldset className="border-border mt-3 border p-3">
          <legend className="px-1 text-sm">אוספים</legend>
          {choices.collections.map((collection) => (
            <Check
              key={collection.id}
              name="collection"
              id={collection.id}
              label={collection.nameHe}
              checked={selected.collections.includes(collection.id)}
            />
          ))}
        </fieldset>
      )}

      {scope === 'PRODUCT' && (
        <fieldset className="border-border mt-3 max-h-96 overflow-y-auto border p-3">
          <legend className="px-1 text-sm">דגמים</legend>
          {choices.products.map((product) => (
            <Check
              key={product.id}
              name="product"
              id={product.id}
              label={product.nameHe}
              hint={product.categoryHe}
              checked={selected.products.includes(product.id)}
            />
          ))}
        </fieldset>
      )}
    </div>
  );
}

function Check({
  name,
  id,
  label,
  hint,
  bold = false,
  checked,
}: {
  name: string;
  id: string;
  label: string;
  hint?: string;
  bold?: boolean;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm">
      <input type="checkbox" name={name} value={id} defaultChecked={checked} className="size-4" />
      <span className={bold ? 'font-semibold' : undefined}>{label}</span>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </label>
  );
}
