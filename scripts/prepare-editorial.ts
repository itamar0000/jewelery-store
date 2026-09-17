/**
 * Turns a source image into the editorial files the storefront expects.
 *
 *   node scripts/prepare-editorial.ts --asset hero --in ~/Downloads/hero.png
 *   node scripts/prepare-editorial.ts --from .editorial-drafts/chosen
 *   node scripts/prepare-editorial.ts --from ./picks --dry-run
 *
 * WHERE THE PICTURES COME FROM IS NOT THIS SCRIPT'S BUSINESS. A camera, a
 * stock library, an image model, a designer's export - it takes a file and
 * produces the crops the registry declares. That independence is the point:
 * the delivery pipeline should not have to change when the source does.
 *
 * WHAT IT ACTUALLY SOLVES. The registry already knows every asset's path,
 * master size and focal point, but a person cannot apply that by hand without
 * getting it wrong: nine assets, eleven output files, four different aspect
 * ratios, and a focal point per crop. Doing it from the registry means the
 * files on disk cannot disagree with the code that reads them.
 *
 * THE CROP MATCHES WHAT THE BROWSER WOULD DO. `object-fit: cover` with
 * `object-position: x% y%` has exact arithmetic, reproduced in `coverCrop`
 * below. This matters more than it sounds: the storefront ALSO applies
 * `object-position` from the same focal point at render time. If this script
 * cropped centred instead, the focal point would be applied twice from
 * different starting frames and the result would drift off the subject.
 * Cropping the master to the master's own ratio and letting the browser take
 * it from there keeps one focal point doing one job.
 *
 * ENCODING. JPEG at quality 86, chroma subsampling off, mozjpeg. Editorial
 * images are large warm-toned photographs where banding in a gradient is the
 * visible failure, not file size; 4:2:0 subsampling is what puts colour
 * fringing on a gold highlight against skin. `next/image` re-encodes to WebP
 * or AVIF for delivery anyway, so this file is a MASTER - it should be the
 * best input available to that step, not itself optimised for the wire.
 */
import { readdir, readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

import {
  EDITORIAL_ASSETS,
  EDITORIAL_ASSET_LIST,
  type EditorialAsset,
  type EditorialAssetId,
  type EditorialMasterSize,
  type FocalPoint,
} from '../src/lib/content/editorial-assets.ts';

/** Where `desktopSrc` (`/images/...`) resolves to on disk. */
const PUBLIC_DIR = path.join(process.cwd(), 'public');

/** Extensions accepted as a source. Whatever sharp can decode. */
const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tif', '.tiff']);

interface Job {
  readonly asset: EditorialAsset;
  readonly sourceFile: string;
}

interface Output {
  readonly outPath: string;
  readonly size: EditorialMasterSize;
  readonly focal: FocalPoint;
  readonly label: 'desktop' | 'mobile';
}

/* ────────────────────────────────────────────────────────────────────────
 * The crop
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The `object-fit: cover` rectangle, in SOURCE pixel coordinates.
 *
 * Cover scales the image until it fills the box on both axes, which means the
 * scale is the LARGER of the two ratios and the excess on the other axis is
 * discarded. Working backwards, the region of the source that survives is the
 * target box divided by that scale.
 *
 * `object-position` then decides which part of the excess is discarded, and it
 * is a proportion rather than an offset: 50% centres, 0% keeps the left/top
 * edge, 100% keeps the right/bottom. So the offset is simply the leftover
 * multiplied by the percentage - which is why a focal point never needs to
 * know the source's dimensions.
 *
 * Rounded, then clamped: sharp's `extract` rejects a region that runs one
 * pixel past the edge, and rounding at two independent boundaries can do
 * exactly that on an odd-sized source.
 */
function coverCrop(
  source: EditorialMasterSize,
  target: EditorialMasterSize,
  focal: FocalPoint,
): { left: number; top: number; width: number; height: number } {
  const scale = Math.max(target.width / source.width, target.height / source.height);

  const width = Math.min(source.width, Math.round(target.width / scale));
  const height = Math.min(source.height, Math.round(target.height / scale));

  const left = Math.round((source.width - width) * (focal.x / 100));
  const top = Math.round((source.height - height) * (focal.y / 100));

  return {
    left: Math.max(0, Math.min(left, source.width - width)),
    top: Math.max(0, Math.min(top, source.height - height)),
    width,
    height,
  };
}

/** Every file one asset produces, with the focal point that governs each. */
function outputsFor(asset: EditorialAsset): readonly Output[] {
  const centre: FocalPoint = { x: 50, y: 50 };
  const desktopFocal = asset.focalPoint ?? centre;

  const outputs: Output[] = [
    {
      outPath: path.join(PUBLIC_DIR, asset.desktopSrc),
      size: asset.master.desktop,
      focal: desktopFocal,
      label: 'desktop',
    },
  ];

  /*
   * The mobile crop takes `mobileFocalPoint` when the registry sets one, and
   * falls back to the desktop focal point rather than to centre - a phone crop
   * is a tighter version of the same photograph, so the desktop point is a far
   * better guess than the middle of the frame.
   */
  if (asset.mobileSrc && asset.master.mobile) {
    outputs.push({
      outPath: path.join(PUBLIC_DIR, asset.mobileSrc),
      size: asset.master.mobile,
      focal: asset.mobileFocalPoint ?? desktopFocal,
      label: 'mobile',
    });
  }

  return outputs;
}

async function render(job: Job, dryRun: boolean): Promise<void> {
  const input = await readFile(job.sourceFile);
  const meta = await sharp(input).metadata();

  if (!meta.width || !meta.height) {
    throw new Error(`Could not read dimensions from ${job.sourceFile}`);
  }

  const source: EditorialMasterSize = { width: meta.width, height: meta.height };
  console.log(`\n${job.asset.id}`);
  console.log(`  source  ${path.basename(job.sourceFile)}  ${source.width}×${source.height}`);

  for (const output of outputsFor(job.asset)) {
    /*
     * UPSCALING IS REPORTED, NOT PREVENTED.
     *
     * A source smaller than the master still produces a usable file - sharp
     * will enlarge it - and refusing would block someone who knowingly wants a
     * smaller image on the page today. But a silently upscaled hero is a
     * soft-looking first screen that nobody traces back to this step, so it is
     * called out every time.
     */
    const shortfall =
      output.size.width > source.width || output.size.height > source.height ? '  ⚠ upscaled' : '';

    const region = coverCrop(source, output.size, output.focal);
    const rel = path.relative(process.cwd(), output.outPath);

    console.log(
      `  ${output.label.padEnd(7)} → ${rel}` +
        `  ${output.size.width}×${output.size.height}` +
        `  focal ${output.focal.x}%/${output.focal.y}%${shortfall}`,
    );

    if (dryRun) continue;

    await mkdir(path.dirname(output.outPath), { recursive: true });

    await sharp(input)
      .extract(region)
      .resize(output.size.width, output.size.height, { fit: 'fill' })
      .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(output.outPath);
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Input resolution
 * ──────────────────────────────────────────────────────────────────────── */

function isAssetId(value: string): value is EditorialAssetId {
  return Object.hasOwn(EDITORIAL_ASSETS, value);
}

/**
 * Matches files in a directory to assets BY FILENAME.
 *
 * `hero.png` is the hero, `category-rings.jpg` is the rings tile. Anything
 * whose stem is not an asset id is reported and skipped rather than guessed
 * at - a near-miss like `rings.png` should be a message, not a silent no-op
 * that leaves someone wondering why their picture never appeared.
 *
 * A trailing `-2`, `-03` or ` copy` is tolerated, because that is what a
 * browser and a draft loop both produce when several files share a name.
 */
async function jobsFromDirectory(dir: string): Promise<readonly Job[]> {
  const entries = await readdir(dir);
  const jobs: Job[] = [];
  const unmatched: string[] = [];

  for (const entry of entries.sort()) {
    const extension = path.extname(entry).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(extension)) continue;

    const stem = path
      .basename(entry, path.extname(entry))
      .replace(/[-_ ]?(copy|\d{1,3})$/i, '')
      .trim();

    if (!isAssetId(stem)) {
      unmatched.push(entry);
      continue;
    }

    jobs.push({ asset: EDITORIAL_ASSETS[stem], sourceFile: path.join(dir, entry) });
  }

  if (unmatched.length > 0) {
    console.log('\nSkipped - filename is not an asset id:');
    for (const file of unmatched) console.log(`  ${file}`);
    console.log(`\nValid ids: ${EDITORIAL_ASSET_LIST.map((a) => a.id).join(', ')}`);
  }

  return jobs;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const assetId = flag('asset');
  const inFile = flag('in');
  const fromDir = flag('from');

  let jobs: readonly Job[];

  if (assetId !== undefined || inFile !== undefined) {
    if (assetId === undefined || inFile === undefined) {
      throw new Error('--asset and --in must be given together.');
    }
    if (!isAssetId(assetId)) {
      throw new Error(
        `Unknown asset "${assetId}".\nValid ids: ${EDITORIAL_ASSET_LIST.map((a) => a.id).join(', ')}`,
      );
    }
    await stat(inFile);
    jobs = [{ asset: EDITORIAL_ASSETS[assetId], sourceFile: inFile }];
  } else if (fromDir !== undefined) {
    jobs = await jobsFromDirectory(fromDir);
  } else {
    console.log(
      [
        'Prepare editorial images.',
        '',
        '  node scripts/prepare-editorial.ts --asset <id> --in <file>',
        '  node scripts/prepare-editorial.ts --from <directory>',
        '',
        'Options:',
        '  --dry-run   Report what would be written, write nothing.',
        '',
        `Asset ids: ${EDITORIAL_ASSET_LIST.map((a) => a.id).join(', ')}`,
        '',
        'In --from mode each file is matched to an asset by its filename,',
        'so name the picks after the asset: hero.png, category-rings.png, …',
      ].join('\n'),
    );
    return;
  }

  if (jobs.length === 0) {
    console.log('\nNothing to do - no source file matched an asset.');
    return;
  }

  console.log(dryRun ? 'DRY RUN - nothing will be written.' : 'Writing editorial masters.');

  for (const job of jobs) await render(job, dryRun);

  console.log(
    dryRun
      ? '\nDry run complete.'
      : `\nWrote ${jobs.length} asset${jobs.length === 1 ? '' : 's'}. Restart the dev server to see them.`,
  );
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
