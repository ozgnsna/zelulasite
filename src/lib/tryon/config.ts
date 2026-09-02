/**
 * Kolye sanal deneme (try-on) yapılandırması.
 * Modeller CDN'den yüklenir; bundle'a gömülmez.
 */

/** Prototip: buton yalnızca bu slug/SKU'larda görünür. */
export const TRYON_ENABLED_SLUGS = [
  "capolia-dogal-mercan-ve-inci-detayli-el-yapimi-kolye",
] as const;

export const TRYON_ENABLED_SKUS = ["Zelula282"] as const;

export function isNecklaceTryOnEnabled(sku: string | null | undefined, slug: string | null | undefined) {
  const s = String(sku ?? "").trim();
  const sl = String(slug ?? "").trim().toLowerCase();
  if (s && (TRYON_ENABLED_SKUS as readonly string[]).includes(s)) return true;
  if (sl && (TRYON_ENABLED_SLUGS as readonly string[]).some((x) => x.toLowerCase() === sl)) return true;
  return false;
}

/** @mediapipe/tasks-vision WASM (CDN — pin sürüm). */
export const MEDIAPIPE_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

export const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export const POSE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/** Omuz mesafesine göre kolye genişliği oranı (önceki 1.18 fazla büyüktü). */
export const NECKLACE_WIDTH_RATIO = 0.88;

/** Çene → omuz orta noktası lerp. Düşük = yukarı (boyun); yüksek = göğüs. */
export const NECK_ANCHOR_T = 0.28;

/**
 * Overlay CSS translate Y (yüzde, öğe yüksekliğine göre).
 * Negatif = klipsi ankrajın biraz üstüne alır (boyun kökü).
 */
export const OVERLAY_TRANSLATE_Y_PCT = -8;

/** Landmark smoothing (0–1; yüksek = daha hızlı takip, daha fazla zıplama). */
export const ANCHOR_SMOOTH_ALPHA = 0.32;

/** MediaPipe Face Landmarker: çene ucu. */
export const FACE_CHIN_INDEX = 152;

/** MediaPipe Pose: sol / sağ omuz. */
export const POSE_LEFT_SHOULDER = 11;
export const POSE_RIGHT_SHOULDER = 12;
