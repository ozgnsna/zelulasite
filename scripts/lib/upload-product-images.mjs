/**
 * Import script'leri için yerel dosyayı bucket'a yazar, w400/w800 türevlerini üretir.
 */
import fs from "node:fs";
import path from "node:path";
import {
  PRODUCT_IMAGE_BUCKET,
  buildDerivativeBuffers,
  uploadDerivativeBuffers,
} from "../../src/lib/images/generate-product-derivatives.mjs";

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export async function uploadLocalProductImages(admin, productId, imageFiles) {
  const urls = [];
  for (let i = 0; i < imageFiles.length; i += 1) {
    const localPath = imageFiles[i];
    const bytes = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase() || ".jpg";
    const storagePath = `products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const { error: uploadError } = await admin.storage.from(PRODUCT_IMAGE_BUCKET).upload(storagePath, bytes, {
      contentType: contentTypeFor(localPath),
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message || "Görsel yüklenemedi");
    const widths = await uploadDerivativeBuffers(
      admin.storage,
      storagePath,
      await buildDerivativeBuffers(bytes),
    );
    const { data } = admin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
    const { error: insertError } = await admin.from("product_images").insert({
      product_id: productId,
      image_url: data.publicUrl,
      is_cover: i === 0,
      sort_order: i,
      derivative_widths: widths,
    });
    if (insertError) throw new Error(insertError.message || "Görsel kaydı eklenemedi");
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function uploadOneLocalProductImage(admin, productId, localPath) {
  const urls = await uploadLocalProductImages(admin, productId, [localPath]);
  return urls[0];
}
