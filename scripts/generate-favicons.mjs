/**
 * Zelula favicon — bust (O) odaklı, kareyi doldurur (sekmede küçük kalmaz).
 * Kullanım: npm run favicons
 */
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPng = join(root, "public/zelula-logo.png");

/** 1024² logo: bust “o” ~%40–58 yatay, üst %12–%48 dikey */
async function rasterizeBustIcon(size) {
  const meta = await sharp(logoPng).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  const side = Math.round(w * 0.3);
  const left = Math.round(w * 0.35);
  const top = Math.round(h * 0.12);
  const cropW = Math.min(side, w - left);
  const cropH = Math.min(side, Math.round(h * 0.42) - top);

  return sharp(logoPng)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(size, size, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: "#ffffff" })
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
  const [icon32, icon48, icon96, apple180] = await Promise.all([
    rasterizeBustIcon(32),
    rasterizeBustIcon(48),
    rasterizeBustIcon(96),
    rasterizeApple(180),
  ]);

  const appDir = join(root, "src/app");
  const publicDir = join(root, "public");

  await Promise.all([
    writeFile(join(appDir, "icon.png"), icon96),
    writeFile(join(appDir, "apple-icon.png"), apple180),
    writeFile(join(publicDir, "icon-32.png"), icon32),
    writeFile(join(publicDir, "icon-48.png"), icon48),
    writeFile(join(publicDir, "icon-96.png"), icon96),
    writeFile(join(publicDir, "apple-touch-icon.png"), apple180),
  ]);

  console.log("Favicon güncellendi (bust büyük, 96px).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
