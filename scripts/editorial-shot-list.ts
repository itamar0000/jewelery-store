/**
 * Prints the shot list for the editorial imagery.
 *
 *   npm run editorial:shots
 *
 * WHY THIS EXISTS. The registry already holds what every editorial image must
 * show, where it goes, what shape it is cropped to and where its focal point
 * sits. Restating any of that in a separate brief document would create a
 * second source of truth that drifts from the code within a week. This reads
 * the registry instead, so the brief cannot be out of date.
 *
 * It also reports which files are still MISSING - by checking the disk, the
 * same way the storefront does - so the list shrinks as assets are delivered
 * and reaches zero exactly when the placeholders stop rendering.
 */
import {
  EDITORIAL_ART_DIRECTION,
  EDITORIAL_ASSET_LIST,
  missingEditorialAssets,
} from '../src/lib/content/editorial-assets.ts';

const missing = new Set(missingEditorialAssets().map((asset) => asset.id));

function wrap(text: string, width = 76, indent = '    '): string {
  const lines: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);

  return lines.map((entry) => indent + entry).join('\n');
}

console.log('EDITORIAL SHOT LIST');
console.log('='.repeat(78));
console.log();
console.log('SHARED ART DIRECTION - applies to every image below:');
console.log(wrap(EDITORIAL_ART_DIRECTION));
console.log();
console.log(
  wrap(
    'No text of any kind belongs inside these images: no logo, slogan, ' +
      'typography, watermark or interface. Every word on the site is HTML, ' +
      'which is what lets the branding change later without re-shooting.',
  ),
);
console.log();
console.log('='.repeat(78));

for (const asset of EDITORIAL_ASSET_LIST) {
  const status = missing.has(asset.id) ? 'MISSING' : 'delivered';

  console.log();
  console.log(`[${status}] ${asset.id}  (${asset.section})`);
  console.log(`    crop:  ${asset.aspect}`);
  console.log(`    file:  ${asset.desktopSrc}`);
  if (asset.mobileSrc) console.log(`    phone: ${asset.mobileSrc}`);
  if (asset.focalPoint) {
    const { x, y } = asset.focalPoint;
    console.log(`    focus: ${x}% ${y}%${asset.mobileFocalPoint ? ' (phone crop differs)' : ''}`);
  }
  console.log(
    `    alt:   ${asset.alt === '' ? '(decorative - described by the surrounding copy)' : asset.alt}`,
  );
  console.log('    brief:');
  console.log(wrap(asset.brief, 72, '      '));
}

console.log();
console.log('='.repeat(78));
console.log(`${missing.size} of ${EDITORIAL_ASSET_LIST.length} still to be produced.`);
console.log('Drop a file at the path above and restart the dev server; nothing else changes.');
