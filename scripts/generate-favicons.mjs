/**
 * Zelula favicon — bust bölgesi otomatik kırpma, kareyi doldurur.
 * Kullanım: npm run favicons
 */
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPng = join(root, "public/zelula-logo.png");

/** Logo üzerinde metin+bust sınır kutusu (1024² PNG). */
const TEXT_BOUNDS = { left: 105, top: 321, width: 819, height: 350 };

async function rasterizeBustIcon(size) {
  const { left: tLeft, top: tTop, width: tW, height: tH } = TEXT_BOUNDS;
  const bustCenterX = tLeft + Math.round(tW * 0.54);
  const bustCenterY = tTop + Math.round(tH * 0.4);
  const side = Math.round(Math.min(tH * 0.88, tW * 0.2));

  const imgW = 1024;
  const imgH = 1024;
  const left = Math.min(Math.max(0, bustCenterX - Math.round(side / 2)), imgW - side);
  const top = Math.min(Math.max(0, bustCenterY - Math.round(side / 2)), imgH - side);

  return sharp(logoPng)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, { fit: "cover", position: "centre" })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Sekme için alternatif: tüm kelime markası (tagline hariç), kareyi doldurur. */
async function rasterizeWordmarkIcon(size) {
  const { left, top, width, height } = TEXT_BOUNDS;
  return sharp(logoPng)
    .extract({ left, top, width, height })
    .resize(size, size, { fit: "cover", position: "centre" })
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
  const rasterize = rasterizeBustIcon;
  const [icon32, icon48, icon96, apple180] = await Promise.all([
    rasterize(32),
    rasterize(48),
    rasterize(96),
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

  console.log("Favicon güncellendi (bust merkezli kırpma).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
