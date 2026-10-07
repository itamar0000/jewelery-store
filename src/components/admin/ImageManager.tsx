'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { cn } from '@/components/ui/cn';
import { imageCommandAction, uploadProductImageAction } from '@/lib/admin/product-actions';

/**
 * A product's photographs, by group (D4D.25): one group per gold colour, and
 * one for all colours. Upload, order, mark as a simulation, remove.
 *
 * PHOTOGRAPHS ARE DOWNSCALED HERE, IN THE BROWSER, before they are sent: a
 * phone photograph is 4-12MB and the server accepts 4MB per request. The long
 * side is capped at 2400px - more than the largest gallery slot needs at 2x -
 * and the result is a JPEG, re-encoded until it fits. The orientation a phone
 * records in EXIF is applied, and the metadata (location included) is not
 * carried over, since a canvas does not keep it.
 */

const MAX_SIDE = 2400;
const MAX_BYTES = 3.8 * 1024 * 1024;

interface Group {
  readonly key: string;
  readonly labelHe: string;
  readonly images: readonly {
    readonly storageKey: string;
    readonly url: string | null;
    readonly isSimulation: boolean;
  }[];
}

async function prepare(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no canvas');
  // A transparent PNG would turn black as a JPEG; the site's paper is behind it.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.9, 0.82, 0.72, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (blob && blob.size <= MAX_BYTES) return { blob, width, height };
  }
  throw new Error('too large');
}

export function ImageManager({
  productId,
  slug,
  groups,
}: {
  productId: string;
  slug: string;
  groups: readonly Group[];
}) {
  return (
    <div className="mt-4 space-y-8">
      {groups.map((group) => (
        <GroupPanel key={group.key} productId={productId} slug={slug} group={group} />
      ))}
    </div>
  );
}

function GroupPanel({ productId, slug, group }: { productId: string; slug: string; group: Group }) {
  const router = useRouter();
  const inputId = useId();
  const [simulated, setSimulated] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList) {
    setBusy(true);
    let done = 0;
    for (const file of Array.from(files)) {
      setStatus({ ok: true, text: `מעלה ${done + 1} מתוך ${files.length}…` });
      let prepared;
      try {
        prepared = await prepare(file);
      } catch {
        setStatus({
          ok: false,
          text: `לא הצלחתי לקרוא את "${file.name}". שמרו אותה כ-JPG ונסו שוב.`,
        });
        continue;
      }
      const form = new FormData();
      form.set('productId', productId);
      form.set('slug', slug);
      form.set('group', group.key);
      form.set('simulated', String(simulated));
      form.set('width', String(prepared.width));
      form.set('height', String(prepared.height));
      form.set('file', prepared.blob, 'photo.jpg');
      const result = await uploadProductImageAction(form);
      if (!result.ok) {
        setStatus({ ok: false, text: result.message ?? 'ההעלאה נכשלה.' });
        break;
      }
      done += 1;
    }
    setBusy(false);
    if (done > 0)
      setStatus({ ok: true, text: done === 1 ? 'התמונה נוספה.' : `${done} תמונות נוספו.` });
    router.refresh();
  }

  function command(storageKey: string, name: string) {
    const form = new FormData();
    form.set('productId', productId);
    form.set('slug', slug);
    form.set('group', group.key);
    form.set('storageKey', storageKey);
    form.set('command', name);
    startTransition(async () => {
      const result = await imageCommandAction({ ok: true, message: null }, form);
      if (!result.ok) setStatus({ ok: false, text: result.message ?? 'הפעולה נכשלה.' });
      router.refresh();
    });
  }

  return (
    <section aria-label={group.labelHe}>
      <h3 className="font-semibold">{group.labelHe}</h3>
      {group.images.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {group.key === 'ALL'
            ? 'אין תמונות כלליות. הן מוצגות בכרטיס המוצר ובכל גוון שאין לו תמונות משלו.'
            : 'אין תמונות לגוון הזה. יוצגו התמונות הכלליות.'}
        </p>
      ) : (
        <ol className={cn('mt-3 flex flex-wrap gap-4', pending && 'opacity-60')}>
          {group.images.map((image, index) => (
            <li key={image.storageKey} className="w-36 text-xs">
              <div className="bg-muted relative aspect-square overflow-hidden">
                {image.url && (
                  <Image src={image.url} alt="" fill sizes="144px" className="object-cover" />
                )}
                <span className="bg-background/90 absolute start-1 top-1 px-1.5 py-0.5 tabular-nums">
                  {index + 1}
                </span>
                {image.isSimulation && (
                  <span className="bg-background/90 absolute end-1 top-1 px-1.5 py-0.5">הדמיה</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                <button
                  type="button"
                  disabled={index === 0 || pending}
                  onClick={() => command(image.storageKey, 'earlier')}
                  className="underline disabled:no-underline disabled:opacity-40"
                >
                  לפני
                </button>
                <button
                  type="button"
                  disabled={index === group.images.length - 1 || pending}
                  onClick={() => command(image.storageKey, 'later')}
                  className="underline disabled:no-underline disabled:opacity-40"
                >
                  אחרי
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    command(
                      image.storageKey,
                      image.isSimulation ? 'simulation-off' : 'simulation-on',
                    )
                  }
                  className="underline"
                >
                  {image.isSimulation ? 'לא הדמיה' : 'סימון כהדמיה'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm('להסיר את התמונה מהמוצר?'))
                      command(image.storageKey, 'remove');
                  }}
                  className="text-destructive underline"
                >
                  הסרה
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <label
          htmlFor={inputId}
          className={cn(
            'border-border-field hover:border-accent inline-flex h-9 cursor-pointer items-center border px-4',
            busy && 'pointer-events-none opacity-60',
          )}
        >
          {busy ? 'מעלה…' : 'הוספת תמונות'}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
            event.target.value = '';
          }}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={simulated}
            onChange={(event) => setSimulated(event.target.checked)}
            className="size-4"
          />
          התמונות הן הדמיה (למשל תכשיט על הגוף שנוצר במחשב)
        </label>
        {status && (
          <span
            role={status.ok ? 'status' : 'alert'}
            className={status.ok ? 'text-success' : 'text-destructive'}
          >
            {status.text}
          </span>
        )}
      </div>
    </section>
  );
}
