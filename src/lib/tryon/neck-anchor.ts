import {
  ANCHOR_SMOOTH_ALPHA,
  BODY_SILHOUETTE,
  CHIN_VERTICAL_BLEND,
  FACE_CHIN_INDEX,
  POSE_LEFT_SHOULDER,
  POSE_RIGHT_SHOULDER,
  SHOULDER_ACROMION_OUTSET,
} from "@/lib/tryon/config";

export type Point2 = { x: number; y: number };

export type NeckAnchor = {
  /** 0–1, video/container göreli (ayna: x zaten mirror edilmiş olabilir). */
  x: number;
  y: number;
  /** Kolye görselinin hedef genişliği (0–1, container genişliğine göre). */
  width: number;
  /** Radyan. */
  rotation: number;
};

/** Silüetin kameraya oturmuş hali — rehber çizimi için. */
export type FittedSilhouette = {
  leftShoulder: Point2;
  rightShoulder: Point2;
  necklaceMount: Point2;
  neckGuide: Point2;
  torsoLeft: Point2;
  torsoRight: Point2;
  scale: number;
  rotation: number;
};

export type LandmarkLike = { x: number; y: number; z?: number; visibility?: number };

export const DEFAULT_NECKLACE_ASPECT = 1080 / 810;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * MediaPipe 0–1 video koordinatını object-cover ile kırpılmış container’a map’ler.
 */
export function mapVideoNormToCoverContainer(
  nx: number,
  ny: number,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
): Point2 {
  if (!(videoW > 0 && videoH > 0 && containerW > 0 && containerH > 0)) {
    return { x: nx, y: ny };
  }
  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;

  if (videoAspect > containerAspect) {
    const displayedW = containerH * videoAspect;
    const offsetX = (displayedW - containerW) / 2;
    return {
      x: (nx * displayedW - offsetX) / containerW,
      y: ny,
    };
  }
  const displayedH = containerW / videoAspect;
  const offsetY = (displayedH - containerH) / 2;
  return {
    x: nx,
    y: (ny * displayedH - offsetY) / containerH,
  };
}

/** Yatay mesafeyi cover ölçeğine göre düzelt. */
export function mapVideoLengthToCoverContainerX(
  lengthNorm: number,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
): number {
  if (!(videoW > 0 && videoH > 0 && containerW > 0 && containerH > 0)) return lengthNorm;
  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;
  if (videoAspect > containerAspect) {
    const displayedW = containerH * videoAspect;
    return (lengthNorm * displayedW) / containerW;
  }
  return lengthNorm;
}

export function mapFittedPointToCover(
  p: Point2,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
): Point2 {
  return mapVideoNormToCoverContainer(p.x, p.y, videoW, videoH, containerW, containerH);
}

export function smoothAnchor(prev: NeckAnchor | null, next: NeckAnchor, alpha = ANCHOR_SMOOTH_ALPHA): NeckAnchor {
  if (!prev) return next;
  let d = next.rotation - prev.rotation;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return {
    x: lerp(prev.x, next.x, alpha),
    y: lerp(prev.y, next.y, alpha),
    width: lerp(prev.width, next.width, alpha),
    rotation: prev.rotation + d * alpha,
  };
}

type ShoulderFit = {
  midX: number;
  midY: number;
  scale: number;
  cos: number;
  sin: number;
  rotation: number;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
};

function fitShouldersToSilhouette(
  left: LandmarkLike,
  right: LandmarkLike,
  mirrorX: boolean,
): ShoulderFit | null {
  const mapX = (x: number) => (mirrorX ? 1 - x : x);
  const rawLx = mapX(left.x);
  const rawLy = left.y;
  const rawRx = mapX(right.x);
  const rawRy = right.y;
  const rawDist = Math.hypot(rawRx - rawLx, rawRy - rawLy);
  if (!(rawDist > 0.04)) return null;

  const midX = (rawLx + rawRx) / 2;
  const midY = (rawLy + rawRy) / 2;
  const rotation = Math.atan2(rawRy - rawLy, rawRx - rawLx);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Landmark omuzları içeri kalır → omuz başına doğru dışa genişlet
  const outset = SHOULDER_ACROMION_OUTSET;
  const half = (rawDist * outset) / 2;
  const lx = midX - cos * half;
  const ly = midY - sin * half;
  const rx = midX + cos * half;
  const ry = midY + sin * half;
  const shoulderDist = half * 2;

  return {
    midX,
    midY,
    scale: shoulderDist,
    cos,
    sin,
    rotation,
    lx,
    ly,
    rx,
    ry,
  };
}

/** Silüet lokal noktayı omuzlara hizalı dünya (0–1 video) koordinatına çevir. */
function silhouetteToWorld(local: Point2, fit: ShoulderFit): Point2 {
  // local.x/y omuz açıklığı biriminde; scale = gerçek omuz mesafesi
  return {
    x: fit.midX + (local.x * fit.cos - local.y * fit.sin) * fit.scale,
    y: fit.midY + (local.x * fit.sin + local.y * fit.cos) * fit.scale,
  };
}

/**
 * Algılanan omuzları kanonik silüete oturtur; rehber noktalarını döner.
 */
export function fitBodySilhouette(params: {
  poseLandmarks: LandmarkLike[] | null | undefined;
  mirrorX?: boolean;
}): FittedSilhouette | null {
  const pose = params.poseLandmarks;
  if (!pose?.length) return null;
  const left = pose[POSE_LEFT_SHOULDER];
  const right = pose[POSE_RIGHT_SHOULDER];
  if (!left || !right) return null;
  const visOk = (p: LandmarkLike) => p.visibility === undefined || p.visibility > 0.45;
  if (!visOk(left) || !visOk(right)) return null;

  const fit = fitShouldersToSilhouette(left, right, Boolean(params.mirrorX));
  if (!fit) return null;

  return {
    leftShoulder: { x: fit.lx, y: fit.ly },
    rightShoulder: { x: fit.rx, y: fit.ry },
    necklaceMount: silhouetteToWorld(BODY_SILHOUETTE.necklaceMount, fit),
    neckGuide: silhouetteToWorld(BODY_SILHOUETTE.neckGuide, fit),
    torsoLeft: silhouetteToWorld(BODY_SILHOUETTE.torsoLeft, fit),
    torsoRight: silhouetteToWorld(BODY_SILHOUETTE.torsoRight, fit),
    scale: fit.scale,
    rotation: fit.rotation,
  };
}

/**
 * Silüet + isteğe bağlı çene ince ayarı → kolye ankrajı.
 * Ölçek = omuz açıklığı × BODY_SILHOUETTE.necklaceWidth (yüz clamp yok).
 */
export function computeNeckAnchor(params: {
  faceLandmarks: LandmarkLike[] | null | undefined;
  poseLandmarks: LandmarkLike[] | null | undefined;
  mirrorX?: boolean;
}): NeckAnchor | null {
  const sil = fitBodySilhouette({
    poseLandmarks: params.poseLandmarks,
    mirrorX: params.mirrorX,
  });
  if (!sil) return null;

  let x = sil.necklaceMount.x;
  let y = sil.necklaceMount.y;

  const face = params.faceLandmarks;
  const chin = face?.[FACE_CHIN_INDEX];
  if (chin) {
    const mapX = (v: number) => (params.mirrorX ? 1 - v : v);
    const chinX = mapX(chin.x);
    const chinY = chin.y;
    // Çene↔omuz ortası ≈ boyun kökü; silüet mount ile karıştır
    const neckFromChinY = lerp(chinY, (sil.leftShoulder.y + sil.rightShoulder.y) / 2, 0.42);
    const neckFromChinX = lerp(chinX, (sil.leftShoulder.x + sil.rightShoulder.x) / 2, 0.42);
    y = lerp(sil.necklaceMount.y, neckFromChinY, CHIN_VERTICAL_BLEND);
    x = lerp(sil.necklaceMount.x, neckFromChinX, CHIN_VERTICAL_BLEND * 0.5);
  }

  const width = sil.scale * BODY_SILHOUETTE.necklaceWidth;
  if (!(width > 0.05)) return null;

  return { x, y, width, rotation: sil.rotation };
}
