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
 * Kanonik üst-gövde silüeti (birim: omuz açıklığı = 1).
 * Sol omuz (-0.5, 0), sağ omuz (0.5, 0); Y aşağı artar, negatif Y = başa doğru.
 */
export const BODY_SILHOUETTE = {
  leftShoulder: { x: -0.5, y: 0 },
  rightShoulder: { x: 0.5, y: 0 },
  /**
   * Kırpılmış görünür üst kenar (iki zincir ucu) boyun kökünde.
   * Önceki -0.22 göğüste kaldı; çene–omuz arası boyun köküne çek.
   */
  necklaceMount: { x: 0, y: -0.3 },
  /** Boyut kullanıcıya küçük geldi — 0.5 civarı tut. */
  necklaceWidth: 0.52,
  /** Silüet rehberi: boyun üst noktası (görsel kılavuz). */
  neckGuide: { x: 0, y: -0.38 },
  /** Silüet rehberi: gövde altı (hafif trapez). */
  torsoLeft: { x: -0.42, y: 0.55 },
  torsoRight: { x: 0.42, y: 0.55 },
} as const;

/**
 * Boyun arkasına gelen üst yay + klipsi gizle.
 * Kalan üst kenar = önden görünen iki zincir ucu.
 */
export const NECKLACE_CLIP_TOP_PCT = 36;

/**
 * Overlay CSS translate Y — clip kadar yukarı, görünür üst kenar mount’ta kalsın.
 */
export const OVERLAY_TRANSLATE_Y_PCT = -NECKLACE_CLIP_TOP_PCT;

/** Landmark smoothing (0–1). */
export const ANCHOR_SMOOTH_ALPHA = 0.3;

/** MediaPipe Face Landmarker: çene (dikey ince ayar için). */
export const FACE_CHIN_INDEX = 152;

/** MediaPipe Pose: sol / sağ omuz. */
export const POSE_LEFT_SHOULDER = 11;
export const POSE_RIGHT_SHOULDER = 12;

/**
 * Pose 11/12 eklem noktasıdır; görsel omuz başı (acromion) daha dışarıdadır.
 */
export const SHOULDER_ACROMION_OUTSET = 1.28;

/** Çene blend’i düşük tut — göğüse çekmesin; silüet mount birincil. */
export const CHIN_VERTICAL_BLEND = 0.18;
