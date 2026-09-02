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
   * Önden görünen zincirlerin boyun kökü (köprücük ortası).
   * Klips PNG’nin üstünde; clip ile gizlenir — mount görünür üst kenara yakın.
   */
  necklaceMount: { x: 0, y: -0.14 },
  /** Kolye PNG genişliği (genişletilmiş omuz açıklığının oranı). */
  necklaceWidth: 0.85,
  /** Silüet rehberi: boyun üst noktası (görsel kılavuz). */
  neckGuide: { x: 0, y: -0.38 },
  /** Silüet rehberi: gövde altı (hafif trapez). */
  torsoLeft: { x: -0.42, y: 0.55 },
  torsoRight: { x: 0.42, y: 0.55 },
} as const;

/**
 * Capolia gibi klips üstte olan PNG’lerde üst bandı gizle (önden takılmış görünüm).
 * Yüzde, görsel yüksekliğine göre.
 */
export const NECKLACE_CLIP_TOP_PCT = 16;

/**
 * Overlay CSS translate Y (yüzde, öğe yüksekliğine göre).
 * Clip sonrası görünür üst kenarı mount’a yaslamak için clip kadar yukarı kaydır.
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
 * Algılanan omuz açıklığı bu oranla genişletilir (1 = ham landmark).
 */
export const SHOULDER_ACROMION_OUTSET = 1.28;

/** Çene ile silüet mount arasında dikey blend (0=yalnız silüet, 1=yalnız çene yönü). */
export const CHIN_VERTICAL_BLEND = 0.35;
