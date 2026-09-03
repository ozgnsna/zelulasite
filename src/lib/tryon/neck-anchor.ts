import {
  ANCHOR_SMOOTH_ALPHA,
  BODY_SILHOUETTE,
  CHIN_DROP_RATIO,
  FACE_CHIN_INDEX,
  FACE_FOREHEAD,
  FACE_LEFT_CHEEK,
  FACE_RIGHT_CHEEK,
  FACE_WIDTH_TO_NECKLACE,
  POSE_LEFT_SHOULDER,
  POSE_RIGHT_SHOULDER,
  SHOULDER_ACROMION_OUTSET,
} from "@/lib/tryon/config";

export type Point2 = { x: number; y: number };

export type NeckAnchor = {
  /** 0–1, video/container göreli. */
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
 * MediaPipe 0–1 video koordinatını object-cover ile kırpılmış container'a map'ler.
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

/* ── Omuz fit — yalnızca rehber çizgi (SVG) için ── */

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

  const screenLeft =
    rawLx <= rawRx ? { x: rawLx, y: rawLy } : { x: rawRx, y: rawRy };
  const screenRight =
    rawLx <= rawRx ? { x: rawRx, y: rawRy } : { x: rawLx, y: rawLy };

  const midX = (screenLeft.x + screenRight.x) / 2;
  const midY = (screenLeft.y + screenRight.y) / 2;
  const rotation = Math.atan2(
    screenRight.y - screenLeft.y,
    screenRight.x - screenLeft.x,
  );
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const outset = SHOULDER_ACROMION_OUTSET;
  const half = (rawDist * outset) / 2;
  const lx = midX - cos * half;
  const ly = midY - sin * half;
  const rx = midX + cos * half;
  const ry = midY + sin * half;
  const shoulderDist = half * 2;

  return { midX, midY, scale: shoulderDist, cos, sin, rotation, lx, ly, rx, ry };
}

function silhouetteToWorld(local: Point2, fit: ShoulderFit): Point2 {
  return {
    x: fit.midX + (local.x * fit.cos - local.y * fit.sin) * fit.scale,
    y: fit.midY + (local.x * fit.sin + local.y * fit.cos) * fit.scale,
  };
}

/**
 * Algılanan omuzları kanonik silüete oturtur; rehber çizgi noktalarını döner.
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

/* ── Çene-bazlı kolye anchor (asıl konum + ölçek) ── */

/**
 * Kolyeyi ÇENE + YÜZ GENİŞLİĞİ'nden türetir.
 * Omuz landmark'ına bağımlılık yok — yüz mesh yeterli.
 * Omuz sadece rotation fallback için kullanılır.
 */
export function computeNeckAnchor(params: {
  faceLandmarks: LandmarkLike[] | null | undefined;
  poseLandmarks: LandmarkLike[] | null | undefined;
  mirrorX?: boolean;
}): NeckAnchor | null {
  const face = params.faceLandmarks;
  if (!face?.length) return null;

  const chin = face[FACE_CHIN_INDEX];
  const leftCheek = face[FACE_LEFT_CHEEK];
  const rightCheek = face[FACE_RIGHT_CHEEK];
  const forehead = face[FACE_FOREHEAD];
  if (!chin || !leftCheek || !rightCheek || !forehead) return null;

  const mirror = Boolean(params.mirrorX);
  const mx = (v: number) => (mirror ? 1 - v : v);

  const chinX = mx(chin.x);
  const chinY = chin.y;

  const faceHeight = Math.abs(chinY - forehead.y);
  if (!(faceHeight > 0.02)) return null;

  const lcX = mx(leftCheek.x);
  const rcX = mx(rightCheek.x);
  const faceWidth = Math.abs(lcX - rcX);
  if (!(faceWidth > 0.02)) return null;

  const y = chinY + faceHeight * CHIN_DROP_RATIO;
  const x = (lcX + rcX) / 2;
  const width = faceWidth * FACE_WIDTH_TO_NECKLACE;
  if (!(width > 0.05)) return null;

  // Rotation: yüz tilt'inden türet (sol/sağ yanak Y farkı)
  const lcY = leftCheek.y;
  const rcY = rightCheek.y;
  let rotation = Math.atan2(rcY - lcY, rcX - lcX);
  // Eğer ekranda sol yanak sağdaysa (mirror) rotation ters
  if (lcX > rcX) {
    rotation = Math.atan2(lcY - rcY, lcX - rcX);
  }

  return { x, y, width, rotation };
}
