/**
 * Hero banner PNG → WebP (ana sayfa LCP).
 * npm run optimize:hero-banners
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const files = (await readdir(publicDir)).filter((f) => f.startsWith("hero-banner") && f.endsWith(".png"));

for (const file of files) {
  const input = path.join(publicDir, file);
  const output = path.join(publicDir, file.replace(/\.png$/i, ".webp"));
  const before = (await stat(input)).size;
  await sharp(input).webp({ quality: 82, effort: 6 }).toFile(output);
  const after = (await stat(output)).size;
  console.log(`${file} → ${path.basename(output)} (${Math.round(before / 1024)}KiB → ${Math.round(after / 1024)}KiB)`);
}
