// One-off generator for the PWA icon set. Draws the app's brand mark (an
// indigo rounded square with a white "İ", matching the in-app logo) as SVG and
// rasterizes to the PNG sizes a fully installable PWA needs. Run once:
//   node scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";

const BRAND = "#4F46E5"; // brand indigo (same as PDF/theme primary)
const WHITE = "#ffffff";
const OUT = "public";
mkdirSync(OUT, { recursive: true });

// The "İ" mark drawn as rects so it needs no font: a stem + a tittle (dot).
// `scale` shrinks the glyph for maskable icons so it sits inside the safe zone.
function mark(scale = 1) {
  const cx = 256;
  const stemW = 72 * scale;
  const stemH = 210 * scale;
  const dotS = 72 * scale;
  const gap = 28 * scale;
  const totalH = stemH + gap + dotS;
  const top = 256 - totalH / 2;
  const dotY = top;
  const stemY = top + dotS + gap;
  const r1 = 18 * scale;
  return `
    <rect x="${cx - dotS / 2}" y="${dotY}" width="${dotS}" height="${dotS}" rx="${r1}" fill="${WHITE}"/>
    <rect x="${cx - stemW / 2}" y="${stemY}" width="${stemW}" height="${stemH}" rx="${r1}" fill="${WHITE}"/>`;
}

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${BRAND}"/>${mark(1)}</svg>`;

const square = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}"/>${mark(1)}</svg>`;

// Maskable: full-bleed background, glyph shrunk into the ~80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}"/>${mark(0.66)}</svg>`;

const jobs = [
  [rounded, 192, "pwa-192x192.png"],
  [rounded, 512, "pwa-512x512.png"],
  [maskable, 512, "pwa-maskable-512x512.png"],
  [square, 180, "apple-touch-icon.png"],
  [rounded, 64, "favicon-64.png"],
];

for (const [svg, size, name] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${OUT}/${name}`);
  console.log("wrote", `${OUT}/${name}`);
}

// A crisp SVG favicon too (scales to any size).
import { writeFileSync } from "fs";
writeFileSync(`${OUT}/favicon.svg`, rounded);
console.log("wrote", `${OUT}/favicon.svg`);
