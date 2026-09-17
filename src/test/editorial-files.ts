import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Filesystem fixtures for the editorial asset tests.
 *
 * WHY THESE TESTS TOUCH REAL PATHS AT ALL. Editorial availability is decided by
 * whether a file exists under `public/` - that is the whole mechanism, and the
 * storefront's file-drop workflow depends on it. `resolveEditorialAsset` looks
 * in exactly one place, so a test that wants to exercise the delivered branch
 * has to put a file in exactly that place. There is no injection seam to fake,
 * and adding one purely for tests would make the production path less direct
 * than the thing it models.
 *
 * WHY THIS MODULE EXISTS RATHER THAN A HELPER PER TEST FILE.
 *
 * Two suites - editorial-assets and EditorialImage - independently grew the
 * same fixture: write an empty file at the real path, delete it in `afterEach`.
 * Neither checked whether something was already there.
 *
 * That was harmless for the entire period when no editorial photography
 * existed, and it stayed invisible because the tests passed. The first time
 * real images were delivered, a single `npm test` deleted six of the eleven
 * files from `public/` - and did it twice, because the fix went into one suite
 * and the duplicate in the other carried on.
 *
 * So the rule is now enforced in one place: A TEST MAY NOT BE DESTRUCTIVE TO
 * THE WORKING TREE. Anything genuinely on disk is renamed aside for the
 * duration of a test and put back afterwards, including when an assertion
 * throws.
 */

/** Empty placeholder files this test wrote, to be deleted. */
const created: string[] = [];

/** Real files moved out of the way, to be restored. */
const stashed: { readonly original: string; readonly stash: string }[] = [];

/**
 * A conspicuous suffix rather than a dotfile: if a crash ever leaves one
 * behind, it should be obvious both what it is and where it came from.
 */
const STASH_SUFFIX = '.stashed-by-test';

function onDiskPath(publicPath: string): string {
  return path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
}

/**
 * Makes an asset genuinely absent, preserving any real file.
 *
 * Required by every test that asserts the UNAVAILABLE branch. Once real
 * photography is delivered, "this asset has no file" is false before such a
 * test begins, and the assertion silently stops testing anything.
 */
export function hideEditorialFile(publicPath: string): void {
  const original = onDiskPath(publicPath);
  if (!existsSync(original)) return;

  const stash = original + STASH_SUFFIX;
  renameSync(original, stash);
  stashed.push({ original, stash });
}

/**
 * Puts an empty placeholder at an asset's real path.
 *
 * Real bytes are never needed: nothing under test decodes an image. What is
 * being exercised is the presence check and everything it drives.
 */
export function placeEditorialFile(publicPath: string): void {
  const onDisk = onDiskPath(publicPath);

  hideEditorialFile(publicPath);
  mkdirSync(path.dirname(onDisk), { recursive: true });
  writeFileSync(onDisk, '');
  created.push(onDisk);
}

/**
 * Undoes everything the fixtures did. Call from `afterEach`.
 *
 * Placeholders are removed BEFORE stashes are restored, so a restore never
 * lands on top of a file the test wrote.
 */
export function restoreEditorialFiles(): void {
  for (const file of created) rmSync(file, { force: true });
  created.length = 0;

  for (const { original, stash } of stashed) {
    if (existsSync(stash)) renameSync(stash, original);
  }
  stashed.length = 0;
}
