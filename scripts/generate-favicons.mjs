/**
 * Zelula logosundan favicon üretir (bust / O ikonu odaklı kırpma).
 * Kullanım: npm run favicons  (sharp + to-ico gerekir)
 */
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import toIco from "to-ico";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPng = join(root, "public/zelula-logo.png");

/** Kelime markasındaki bust (O) bölgesini kare kırpar — küçük favicon için okunaklı. */
async function rasterizeMark(size) {
  const meta = await sharp(logoPng).metadata();
  const w = meta.width ?? 800;
  const h = meta.height ?? 200;
  const side = Math.min(h, Math.round(w * 0.36));
  const left = Math.min(Math.round(w * 0.5), Math.max(0, w - side));
  const top = Math.max(0, Math.round((h - side) / 2));

  return sharp(logoPng)
    .extract({ left, top, width: Math.min(side, w - left), height: side })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

/** Apple touch: tam header markası (daha geniş). */
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
  const [icon32, icon16, icon48, apple180] = await Promise.all([
    rasterizeMark(32),
    rasterizeMark(16),
    rasterizeMark(48),
    rasterizeApple(180),
  ]);

  const appDir = join(root, "src/app");
  const publicDir = join(root, "public");
  const icoBuf = await toIco([icon16, icon32, icon48]);

  await Promise.all([
    writeFile(join(appDir, "icon.png"), icon32),
    writeFile(join(appDir, "apple-icon.png"), apple180),
    writeFile(join(appDir, "favicon.ico"), icoBuf),
    writeFile(join(publicDir, "favicon.ico"), icoBuf),
    writeFile(join(publicDir, "icon-32.png"), icon32),
    writeFile(join(publicDir, "apple-touch-icon.png"), apple180),
  ]);

  console.log("Favicon güncellendi (bust kırpması + favicon.ico).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
