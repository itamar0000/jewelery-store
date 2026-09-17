/**
 * Generates editorial image DRAFTS with an image model, for review.
 *
 *   node scripts/generate-editorial.ts --drafts 8
 *   node scripts/generate-editorial.ts --asset hero --drafts 12
 *   node scripts/generate-editorial.ts --asset hero --final --seed 148223
 *   node scripts/generate-editorial.ts --asset category-rings --final --prompt "..."
 *
 * Requires FAL_KEY in the environment or in .env.
 *
 * IT WRITES TO A STAGING DIRECTORY, NEVER TO public/. That separation is the
 * whole safety model of this script. Generated frames land in
 * `.editorial-drafts/`, which is gitignored; a human then picks the ones that
 * are not broken and runs `prepare-editorial.ts` to promote them. Nothing
 * reaches the storefront without someone having looked at it.
 *
 * WHY DRAFTS AT ALL, RATHER THAN ONE GOOD IMAGE. Every asset in this registry
 * is a hand, an ear, a neck or a wrist wearing fine jewellery, which is the
 * worst case for an image model: extra fingers, fused earrings, chains that
 * break mid-link. There is no prompt that avoids this reliably. The working
 * method is volume and culling, and the only reason that is affordable is that
 * a draft costs a few cents - so the script is built around producing many and
 * keeping few, rather than around getting one right.
 *
 * TWO PASSES, ON PURPOSE:
 *
 *   --drafts N   small, cheap, many. For proving the prompt works.
 *   --final      the registry's master size. Repeat until one is right.
 *
 * A SEED DOES NOT CARRY A COMPOSITION ACROSS RESOLUTIONS. This file used to
 * claim it did - that you could pick a draft and re-render "the same image,
 * larger" from its seed - and that is simply false. Tested directly: the hero
 * draft from seed 281501797 at 1520x656 and the final from the same seed at
 * 2520x1080 are different photographs. Same styling, same palette, different
 * pose, different jewellery, different everything that matters.
 *
 * The reason is that a diffusion model's latent grid is sized to the output, so
 * changing the dimensions changes the noise the seed is decoding. The seed
 * fixes the starting noise, not the picture.
 *
 * WHAT THE DRAFT PASS IS ACTUALLY FOR, then, is validating the PROMPT rather
 * than choosing a frame: it shows cheaply whether the composition, palette and
 * anatomy come out right before spending four times as much per image. Choose
 * the final from a batch of finals, not from the drafts.
 *
 * The seed is still recorded in every filename, because it is the only way to
 * reproduce a specific image at the SAME size - which is what you want when a
 * frame is nearly right and you mean to vary the prompt around it.
 *
 * THE REGISTRY IS THE SOURCE OF THE BRIEF, NOT OF THE PROMPT. `brief` is
 * written for a person and says things like "the inline-start third, where the
 * headline sits" - true, and meaningless to an image model. The adapter below
 * translates it. Keeping that translation HERE rather than in the registry is
 * deliberate: how to phrase a request is a property of the tool, and tools get
 * replaced. The design intent stays in src/lib/content/editorial-assets.ts.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  EDITORIAL_ART_DIRECTION,
  EDITORIAL_ASSETS,
  EDITORIAL_ASSET_LIST,
  type EditorialAsset,
  type EditorialAssetId,
} from '../src/lib/content/editorial-assets.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Already in the environment, or no .env file. Both are fine.
}

const DRAFTS_DIR = path.join(process.cwd(), '.editorial-drafts');

/** Sync endpoint: it blocks until the image exists, which is what a CLI wants. */
const FAL_ENDPOINT = 'https://fal.run';
const DEFAULT_MODEL = 'fal-ai/flux-2-pro';

/**
 * Composition phrasing per asset.
 *
 * Three things every entry does that the human brief does not:
 *
 *   - names the FRAMING in words a model responds to ("tight crop", "macro"),
 *     because the registry's `aspect` is a CSS fact, not a photographic one;
 *   - resolves direction. "Inline-start in RTL" is a layout concept; the model
 *     needs "the left side of the frame" - and it IS the left, because the
 *     copy sits on the right of an RTL page, so the subject goes opposite;
 *   - states what must NOT appear, which for several of these carries real
 *     meaning rather than taste (see `diamonds`).
 */
const COMPOSITION: Readonly<Record<EditorialAssetId, string>> = {
  hero: 'Medium crop, elegant understated styling. The woman is positioned toward the LEFT of the frame, leaving the right third as clean, uncluttered negative space for headline text. Cinematic ultra-wide composition.',

  'category-rings':
    'Tight vertical crop on the hand only. Fingers relaxed and clearly separated, neutral manicure, the ring sharply in focus.',
  'category-earrings':
    'Tight vertical crop on the ear and jawline in profile. Hair swept fully back and away from the ear. A single earring, one piercing only.',
  'category-necklaces':
    'Vertical crop of neck, collarbone and one bare shoulder. Skin and metal are the whole subject; clothing reduced to a minimal neutral edge at the bottom of the frame. The chain lies flat and continuous against the skin.',
  'category-bracelets':
    'Vertical crop of a wrist and forearm, arm relaxed and slightly bent, hand out of frame or softly out of focus. The bracelet sits naturally around the wrist.',
  'category-sets':
    'Vertical editorial portrait crop showing a necklace and matching earrings together in one frame. The most fashion-led image of the set.',

  atelier:
    "Vertical crop of a goldsmith's hands at a jeweller's bench: setting a stone with fine tools, a pencil sketch and small gold components on the worktop. Warm focused task lighting, real workshop texture. Not a meeting, not a clean corporate studio.",

  bridal:
    'Wide horizontal campaign crop. Close or medium framing on hands wearing an engagement ring and wedding band, or on a neckline with fine jewellery. No bouquets, no venue, no confetti, no wedding-stock clichés.',

  diamonds:
    'Extreme macro of a brilliant-cut diamond set into a gold ring. Real optical refraction and fire, visible facets and prongs, photographic rather than CGI sparkle effects. No laboratory, no scientific or technology imagery of any kind.',
};

/**
 * Appended to every prompt.
 *
 * The text clause repeats what `EDITORIAL_ART_DIRECTION` already says, and the
 * repetition is deliberate: image models weight the end of a prompt heavily,
 * and invented lettering is the single most common way one of these frames
 * becomes unusable. Any Hebrew a model attempts will be malformed, and every
 * word on this site is HTML precisely so that no image ever has to carry one.
 */
const HARD_NEGATIVES =
  'Photographic, shot on a full-frame camera. Absolutely no text, no lettering, ' +
  'no logo, no watermark, no signature, no user interface anywhere in the image. ' +
  'Anatomically correct hands with exactly five fingers. No extra limbs, no ' +
  'deformed jewellery, no floating or broken chain links.';

/**
 * The prompt for one asset, or a caller's own.
 *
 * WHY AN OVERRIDE EXISTS. The registry's `brief` is the DESIGN intent - what
 * the picture must show, written for whoever eventually commissions real
 * photography - and it should not be rewritten every time someone wants to try
 * a different phrasing at the model. `--prompt` keeps those two jobs apart:
 * the brief stays the durable record, the flag is the experiment.
 *
 * THE NEGATIVES ARE APPENDED EITHER WAY, and that is deliberate rather than
 * presumptuous. They are not style - they are the specific failure modes this
 * subject produces: invented lettering, six-fingered hands, chain links that
 * float apart. A hand-written prompt is no less exposed to those than a
 * generated one, and leaving them off would quietly make a custom prompt worse
 * at the thing custom prompts are usually written to fix.
 */
function buildPrompt(asset: EditorialAsset, override?: string): string {
  if (override !== undefined) return [override, HARD_NEGATIVES].join(' ');

  return [EDITORIAL_ART_DIRECTION, asset.brief, COMPOSITION[asset.id], HARD_NEGATIVES].join(' ');
}

/* ────────────────────────────────────────────────────────────────────────
 * Sizing
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The dimensions to request.
 *
 * Drafts are scaled down to roughly a megapixel while KEEPING THE MASTER'S
 * ASPECT RATIO, because composition is the thing being judged and it changes
 * with the frame shape. A square draft standing in for a 21:9 hero would be
 * choosing between compositions that will not exist at full size.
 *
 * fal bills per megapixel of output, rounded up, so a ~1MP draft is the
 * cheapest useful size rather than an arbitrary one.
 */
function requestSize(asset: EditorialAsset, final: boolean): { width: number; height: number } {
  const master = asset.master.desktop;
  if (final) return master;

  const scale = Math.sqrt(1_000_000 / (master.width * master.height));

  // Rounded to /16: diffusion models expect dimensions on a multiple, and an
  // off-grid request is silently rounded somewhere in the stack anyway.
  const round16 = (value: number): number => Math.max(256, Math.round(value / 16) * 16);

  return { width: round16(master.width * scale), height: round16(master.height * scale) };
}

/* ────────────────────────────────────────────────────────────────────────
 * The call
 * ──────────────────────────────────────────────────────────────────────── */

interface FalImage {
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
}

interface FalResponse {
  readonly images?: readonly FalImage[];
  readonly seed?: number;
}

/**
 * A failure that will hit every remaining request identically.
 *
 * WHY THIS DISTINCTION EARNS A CLASS. A batch is 54 requests. A bad prompt or a
 * safety rejection affects one of them and the run should carry on; an expired
 * key or an unfunded account affects all 54, and retrying is just 53 more
 * identical failures scrolling past - with the one useful message buried at the
 * top of the output rather than at the bottom where someone is looking.
 *
 * So these abort the run immediately and print what to actually do about it.
 */
class FatalFalError extends Error {}

/** A failure worth waiting out. See the note on `TOP_UP` below. */
class TransientFalError extends Error {}

/**
 * The account's prepaid balance, in dollars, or `null` if it cannot be read.
 *
 * Read ONCE at startup, and the only thing it is used for is disambiguating
 * the error below - which is a question this script genuinely cannot answer
 * from the failure alone.
 */
async function fetchBalance(key: string): Promise<number | null> {
  try {
    const response = await fetch('https://rest.alpha.fal.ai/billing/user_balance', {
      headers: { Authorization: `Key ${key}` },
    });
    if (!response.ok) return null;
    const value = Number((await response.text()).trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Turns fal's JSON error body into something actionable.
 *
 * THE `TOP_UP` LOCK MEANS TWO COMPLETELY DIFFERENT THINGS, and telling them
 * apart is the whole reason `balance` is threaded in here.
 *
 * `{"detail":"User is locked. Reason: TOP_UP."}` is returned both when the
 * account is genuinely out of money AND, transiently, when requests arrive too
 * quickly - fal appears to lock the account for a moment under load and
 * reports the same reason string for it. Observed directly while building
 * this: a batch ran five images, locked, and then three single requests
 * moments later all succeeded against an unchanged $9.82 balance.
 *
 * Treating that as fatal - which this function used to - aborts a paid run
 * that would have finished, and sends someone to a billing page that already
 * has money on it. Treating it as retryable when the balance really is zero
 * would instead spin uselessly. So the balance decides, and when it cannot be
 * read the benefit of the doubt goes to retrying: a wasted wait is cheaper
 * than a wrongly abandoned batch.
 */
function explainFalError(
  status: number,
  body: string,
  balance: number | null,
): { message: string; kind: 'fatal' | 'transient' | 'request' } {
  let detail = body.slice(0, 300);
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === 'object' && 'detail' in parsed) {
      detail = String((parsed as { detail: unknown }).detail);
    }
  } catch {
    // Not JSON. The raw text is the best available message.
  }

  if (status === 403 && /top_?up|locked/i.test(detail)) {
    const funded = balance === null || balance > 0;

    if (funded) {
      return { kind: 'transient', message: `account locked briefly (${detail})` };
    }

    return {
      kind: 'fatal',
      message: [
        `fal 403 - ${detail}`,
        '',
        'The key is valid; the ACCOUNT has no credit. fal is prepaid, so a',
        'zero balance locks every request.',
        '',
        '  Add credit at https://fal.ai/dashboard/billing',
        '  Then re-run this command - nothing else needs to change.',
      ].join('\n'),
    };
  }

  if (status === 429 || status >= 500) {
    return { kind: 'transient', message: `fal ${status} - ${detail}` };
  }

  if (status === 401 || status === 403) {
    return {
      kind: 'fatal',
      message: [
        `fal ${status} - ${detail}`,
        '',
        'Check FAL_KEY in .env against https://fal.ai/dashboard/keys',
      ].join('\n'),
    };
  }

  if (status === 404) {
    return {
      kind: 'fatal',
      message: [
        `fal 404 - ${detail}`,
        '',
        'That model id does not exist. Pass a different one with --model,',
        'or browse https://fal.ai/models',
      ].join('\n'),
    };
  }

  // 422 and friends: this prompt was rejected, the next one may not be.
  return { kind: 'request', message: `fal ${status} - ${detail}` };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One image, with patience.
 *
 * The backoff exists for the transient lock described above, and it starts
 * long - five seconds - because the thing being waited out is an account-level
 * guard rather than a busy server. A 200ms retry would simply be a sixth
 * request into the same closed door.
 *
 * Attempts are per-image, so a batch can absorb several locks without losing a
 * slot. Only when one image exhausts all of them does it count as failed and
 * the run moves on.
 */
async function generateWithRetry(
  key: string,
  model: string,
  prompt: string,
  size: { width: number; height: number },
  seed: number | undefined,
  balance: number | null,
  attempts = 4,
): Promise<{ bytes: Buffer; seed: number | undefined }> {
  let wait = 5000;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await generateOne(key, model, prompt, size, seed, balance);
    } catch (error) {
      if (!(error instanceof TransientFalError) || attempt >= attempts) throw error;

      process.stdout.write(`  … ${error.message}, waiting ${wait / 1000}s\n`);
      await sleep(wait);
      wait *= 2;
    }
  }
}

async function generateOne(
  key: string,
  model: string,
  prompt: string,
  size: { width: number; height: number },
  seed: number | undefined,
  balance: number | null,
): Promise<{ bytes: Buffer; seed: number | undefined }> {
  const response = await fetch(`${FAL_ENDPOINT}/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      // fal accepts either a preset name or an explicit object. The object is
      // what lets the draft keep the master's ratio rather than snapping to
      // one of the six presets.
      image_size: { width: size.width, height: size.height },
      output_format: 'jpeg',
      ...(seed !== undefined ? { seed } : {}),
    }),
  });

  if (!response.ok) {
    const { message, kind } = explainFalError(response.status, await response.text(), balance);
    if (kind === 'fatal') throw new FatalFalError(message);
    if (kind === 'transient') throw new TransientFalError(message);
    throw new Error(message);
  }

  const body = (await response.json()) as FalResponse;
  const image = body.images?.[0];

  if (!image?.url) {
    throw new Error(`No image in response: ${JSON.stringify(body).slice(0, 300)}`);
  }

  const file = await fetch(image.url);
  if (!file.ok) throw new Error(`Could not download result: ${file.status}`);

  return { bytes: Buffer.from(await file.arrayBuffer()), seed: body.seed };
}

/* ────────────────────────────────────────────────────────────────────────
 * CLI
 * ──────────────────────────────────────────────────────────────────────── */

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function isAssetId(value: string): value is EditorialAssetId {
  return Object.hasOwn(EDITORIAL_ASSETS, value);
}

async function main(): Promise<void> {
  const key = process.env.FAL_KEY;

  if (!key) {
    console.log(
      [
        'FAL_KEY is not set.',
        '',
        '  1. Create a key at https://fal.ai/dashboard/keys',
        '  2. Add it to .env:   FAL_KEY="…"',
        '',
        '.env is gitignored, so the key stays local.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const balance = await fetchBalance(key);
  const model = flag('model') ?? DEFAULT_MODEL;
  const final = process.argv.includes('--final');
  const seedFlag = flag('seed');
  const assetFlag = flag('asset');
  const drafts = Number(flag('drafts') ?? (final ? 1 : 6));

  if (!Number.isInteger(drafts) || drafts < 1 || drafts > 50) {
    throw new Error('--drafts must be a whole number between 1 and 50.');
  }

  if (assetFlag !== undefined && !isAssetId(assetFlag)) {
    throw new Error(
      `Unknown asset "${assetFlag}".\nValid ids: ${EDITORIAL_ASSET_LIST.map((a) => a.id).join(', ')}`,
    );
  }

  if (final && assetFlag === undefined) {
    throw new Error('--final renders one chosen composition, so it needs --asset.');
  }

  const promptOverride = flag('prompt');

  if (promptOverride !== undefined && assetFlag === undefined) {
    throw new Error('--prompt applies to one asset, so it needs --asset.');
  }

  const assets = assetFlag ? [EDITORIAL_ASSETS[assetFlag]] : [...EDITORIAL_ASSET_LIST];
  const count = final ? 1 : drafts;

  console.log(`model   ${model}`);
  console.log(`balance ${balance === null ? 'unknown' : `$${balance.toFixed(2)}`}`);
  console.log(`mode    ${final ? 'FINAL (master size)' : `drafts × ${count}`}`);
  console.log(`assets  ${assets.map((a) => a.id).join(', ')}\n`);

  let produced = 0;
  let failed = 0;

  for (const asset of assets) {
    const size = requestSize(asset, final);
    const prompt = buildPrompt(asset, promptOverride);
    const outDir = path.join(DRAFTS_DIR, asset.id);
    await mkdir(outDir, { recursive: true });

    console.log(`${asset.id}  ${size.width}×${size.height}`);

    for (let index = 0; index < count; index += 1) {
      /*
       * A seed is only pinned when one was ASKED for. Leaving it undefined lets
       * the service roll a fresh one per request, which is what makes a batch
       * of drafts different from each other rather than one image repeated.
       */
      const seed = seedFlag !== undefined ? Number(seedFlag) : undefined;

      try {
        const result = await generateWithRetry(key, model, prompt, size, seed, balance);

        // The seed goes in the FILENAME because that is the only place it
        // survives being looked at in a file browser - which is how these get
        // reviewed. Losing it means the draft cannot be rendered at full size.
        const stamp = result.seed ?? seed ?? 'unknown';
        const name = final
          ? `${asset.id}.jpg`
          : `${asset.id}--${String(index + 1).padStart(2, '0')}--seed${stamp}.jpg`;

        await writeFile(path.join(outDir, name), result.bytes);
        // Cheaper than a retry: pacing the batch keeps the account-level
        // guard from tripping in the first place.
        await sleep(1200);
        console.log(`  ✓ ${name}`);
        produced += 1;
      } catch (error) {
        // Nothing has been spent on a fatal error - the request never ran -
        // so stopping costs nothing and saves 50-odd identical failures.
        if (error instanceof FatalFalError) throw error;

        console.log(`  ✗ ${error instanceof Error ? error.message : String(error)}`);
        failed += 1;
      }
    }
  }

  console.log(
    `\n${produced} image${produced === 1 ? '' : 's'} written${failed ? `, ${failed} failed` : ''}.`,
  );
  console.log(
    `Staged in ${path.relative(process.cwd(), DRAFTS_DIR)} — nothing has reached the site.`,
  );

  if (!final) {
    console.log(
      [
        '',
        'Next:',
        '  1. Look through the drafts. They tell you whether the PROMPT is right,',
        '     not which frame to keep - a seed does not survive a resize.',
        '  2. Once the prompt looks right, render finals until one is good:',
        '       node scripts/generate-editorial.ts --asset <id> --final',
        '  3. Promote it to the storefront:',
        '       node scripts/prepare-editorial.ts --asset <id> --in .editorial-drafts/<id>/<id>.jpg',
      ].join('\n'),
    );
  }
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
