import {
  ANCHOR_SMOOTH_ALPHA,
  FACE_CHIN_INDEX,
  FACE_LEFT_CHEEK_INDEX,
  FACE_RIGHT_CHEEK_INDEX,
  NECK_ANCHOR_T,
  NECKLACE_FACE_WIDTH_RATIO,
  NECKLACE_MAX_HEIGHT_RATIO,
  NECKLACE_MAX_SHOULDER_RATIO,
  POSE_LEFT_SHOULDER,
  POSE_RIGHT_SHOULDER,
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

export type LandmarkLike = { x: number; y: number; z?: number; visibility?: number };

/** Capolia try-on PNG doğal oranı (yükseklik / genişlik). */
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

/**
 * Face chin/cheeks + pose shoulders → boyun ankrajı.
 * Ölçek birincil: yüz genişliği; omuz ve max-yükseklik ile clamp.
 */
export function computeNeckAnchor(params: {
  faceLandmarks: LandmarkLike[] | null | undefined;
  poseLandmarks: LandmarkLike[] | null | undefined;
  mirrorX?: boolean;
  neckT?: number;
  necklaceAspect?: number;
}): NeckAnchor | null {
  const face = params.faceLandmarks;
  const pose = params.poseLandmarks;
  if (!face?.length || !pose?.length) return null;

  const chin = face[FACE_CHIN_INDEX];
  const leftCheek = face[FACE_LEFT_CHEEK_INDEX];
  const rightCheek = face[FACE_RIGHT_CHEEK_INDEX];
  const left = pose[POSE_LEFT_SHOULDER];
  const right = pose[POSE_RIGHT_SHOULDER];
  if (!chin || !left || !right) return null;

  const visOk = (p: LandmarkLike) => p.visibility === undefined || p.visibility > 0.45;
  if (!visOk(left) || !visOk(right)) return null;

  const mapX = (x: number) => (params.mirrorX ? 1 - x : x);

  const chinX = mapX(chin.x);
  const chinY = chin.y;
  const lx = mapX(left.x);
  const ly = left.y;
  const rx = mapX(right.x);
  const ry = right.y;

  const midX = (lx + rx) / 2;
  const midY = (ly + ry) / 2;
  const t = params.neckT ?? NECK_ANCHOR_T;

  const x = lerp(chinX, midX, t);
  const y = lerp(chinY, midY, t);
  const shoulderDist = Math.hypot(rx - lx, ry - ly);
  if (!(shoulderDist > 0.02)) return null;

  let faceWidth = 0;
  if (leftCheek && rightCheek) {
    faceWidth = Math.hypot(mapX(rightCheek.x) - mapX(leftCheek.x), rightCheek.y - leftCheek.y);
  }

  const fromFace = faceWidth > 0.02 ? faceWidth * NECKLACE_FACE_WIDTH_RATIO : Number.POSITIVE_INFINITY;
  const fromShoulder = shoulderDist * NECKLACE_MAX_SHOULDER_RATIO;
  const aspect = params.necklaceAspect ?? DEFAULT_NECKLACE_ASPECT;
  const fromMaxHeight = NECKLACE_MAX_HEIGHT_RATIO / Math.max(0.5, aspect);

  const width = Math.min(fromFace, fromShoulder, fromMaxHeight);
  if (!(width > 0.04)) return null;

  const rotation = Math.atan2(ry - ly, rx - lx);

  return { x, y, width, rotation };
}
