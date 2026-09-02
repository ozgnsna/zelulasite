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

/**
 * Kolye genişliği ≈ yüz genişliği × bu oran.
 * Omuz oranına göre ölçek Capolia gibi uzun PNG’lerde göğüste dev halka yaratıyordu.
 */
export const NECKLACE_FACE_WIDTH_RATIO = 1.95;

/** Omuz mesafesine üst sınır (yüz ölçeği bunu aşmasın). */
export const NECKLACE_MAX_SHOULDER_RATIO = 0.58;

/**
 * Overlay yüksekliği frame’in bu oranını aşmasın (uzun PNG clamp).
 * Capolia asset ~1.33 aspect → genişlik buna göre kısılır.
 */
export const NECKLACE_MAX_HEIGHT_RATIO = 0.36;

/** Çene → omuz orta noktası lerp. Boyun kökü / jugular için orta-düşük. */
export const NECK_ANCHOR_T = 0.34;

/**
 * Overlay CSS translate Y (yüzde, öğe yüksekliğine göre).
 * Negatif = klipsi ankrajın biraz üstüne alır.
 */
export const OVERLAY_TRANSLATE_Y_PCT = -6;

/** Landmark smoothing (0–1). */
export const ANCHOR_SMOOTH_ALPHA = 0.32;

/** MediaPipe Face Landmarker: çene ucu + yanaklar. */
export const FACE_CHIN_INDEX = 152;
export const FACE_LEFT_CHEEK_INDEX = 234;
export const FACE_RIGHT_CHEEK_INDEX = 454;

/** MediaPipe Pose: sol / sağ omuz. */
export const POSE_LEFT_SHOULDER = 11;
export const POSE_RIGHT_SHOULDER = 12;

/** @deprecated Omuz tabanlı eski oran — face-width birincil. */
export const NECKLACE_WIDTH_RATIO = NECKLACE_MAX_SHOULDER_RATIO;
