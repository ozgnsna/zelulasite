/**
 * Zelula favicon — PNG, tam kelime markası (tagline hariç).
 * Kullanım: npm run favicons
 */
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPng = join(root, "public/zelula-logo.png");

/** Kare logo: üstte zelola + bust, altta tagline — favicon için üst bölüm. */
async function rasterizeFavicon(size) {
  const meta = await sharp(logoPng).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const cropH = Math.round(h * 0.58);

  return sharp(logoPng)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function rasterizeApple(size) {
  const logoSvg = join(root, "public/zelula-logo-header.svg");
  return sharp(logoSvg, { density: 400 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const [icon32, icon48, apple180] = await Promise.all([
    rasterizeFavicon(32),
    rasterizeFavicon(48),
    rasterizeApple(180),
  ]);

  const appDir = join(root, "src/app");
  const publicDir = join(root, "public");

  await Promise.all([
    writeFile(join(appDir, "icon.png"), icon48),
    writeFile(join(appDir, "apple-icon.png"), apple180),
    writeFile(join(publicDir, "icon-32.png"), icon32),
    writeFile(join(publicDir, "icon-48.png"), icon48),
    writeFile(join(publicDir, "apple-touch-icon.png"), apple180),
  ]);

  console.log("Favicon güncellendi (tam kelime markası, tagline hariç).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
