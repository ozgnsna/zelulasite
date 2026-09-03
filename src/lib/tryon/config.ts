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
 * Kanonik üst-gövde silüeti — yalnızca rehber çizgi için kullanılır.
 */
export const BODY_SILHOUETTE = {
  leftShoulder: { x: -0.5, y: 0 },
  rightShoulder: { x: 0.5, y: 0 },
  necklaceMount: { x: 0, y: -0.22 },
  necklaceWidth: 0.42,
  neckGuide: { x: 0, y: -0.38 },
  torsoLeft: { x: -0.42, y: 0.55 },
  torsoRight: { x: 0.42, y: 0.55 },
} as const;

/**
 * Boyun arkasına gelen üst yay + klipsi gizle.
 */
export const NECKLACE_CLIP_TOP_PCT = 34;

/**
 * Görünür üst kenarı (clip sonrası) anchor’a yasla.
 * Merkeze hizalamak kolyeyi göğse indirir.
 */
export const OVERLAY_TRANSLATE_Y_PCT = -NECKLACE_CLIP_TOP_PCT;

/** Landmark smoothing (0–1). */
export const ANCHOR_SMOOTH_ALPHA = 0.3;

/* ── Face Mesh landmark indeksleri ── */
export const FACE_CHIN_INDEX = 152;
/** Sol yanak dış kenar (tragion yakını). */
export const FACE_LEFT_CHEEK = 234;
/** Sağ yanak dış kenar. */
export const FACE_RIGHT_CHEEK = 454;
/** Alın üst-orta (forehead). */
export const FACE_FOREHEAD = 10;

/* ── Pose landmark indeksleri (rehber çizgi için) ── */
export const POSE_LEFT_SHOULDER = 11;
export const POSE_RIGHT_SHOULDER = 12;
export const SHOULDER_ACROMION_OUTSET = 1.28;

/* ── Çene-bazlı kolye anchor ayarları ── */

/**
 * Kolye Y = çene Y + yüzYüksekliği × bu katsayı.
 * Görünür üst kenar bu noktada (boyun kökü / köprücük).
 */
export const CHIN_DROP_RATIO = 0.12;

/**
 * Kolye genişliği = yüzGenişliği × bu katsayı.
 */
export const FACE_WIDTH_TO_NECKLACE = 1.25;
