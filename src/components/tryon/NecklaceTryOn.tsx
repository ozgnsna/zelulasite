"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import {
  FACE_LANDMARKER_MODEL_URL,
  MEDIAPIPE_WASM_CDN,
  NECKLACE_CLIP_TOP_PCT,
  OVERLAY_TRANSLATE_Y_PCT,
  POSE_LANDMARKER_MODEL_URL,
} from "@/lib/tryon/config";
import {
  computeNeckAnchor,
  fitBodySilhouette,
  mapFittedPointToCover,
  mapVideoLengthToCoverContainerX,
  mapVideoNormToCoverContainer,
  smoothAnchor,
  type NeckAnchor,
} from "@/lib/tryon/neck-anchor";

type FaceLandmarker = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
  };
  close: () => void;
};

type PoseLandmarker = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    landmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
  };
  close: () => void;
};

export type NecklaceTryOnProps = {
  productName: string;
  /** Şeffaf arka planlı gerçek ürün PNG. AI ile üretilmez. */
  necklaceImageUrl: string;
  onClose: () => void;
};

type Phase = "booting" | "camera" | "models" | "ready" | "denied" | "unsupported" | "error";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} zaman aşımı (${ms}ms)`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function waitForVideoElement(
  getEl: () => HTMLVideoElement | null,
  attempts = 30,
): Promise<HTMLVideoElement> {
  for (let i = 0; i < attempts; i++) {
    const el = getEl();
    if (el) return el;
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  }
  throw new Error("Video öğesi hazır değil.");
}

export function NecklaceTryOn({ productName, necklaceImageUrl, onClose }: NecklaceTryOnProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const guidePathRef = useRef<SVGPathElement>(null);
  const guideGlowRef = useRef<SVGPathElement>(null);
  const guideWrapRef = useRef<SVGSVGElement>(null);
  const guideLeftDotRef = useRef<SVGCircleElement>(null);
  const guideRightDotRef = useRef<SVGCircleElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef<NeckAnchor | null>(null);
  const necklaceImgRef = useRef<HTMLImageElement | null>(null);

  const [phase, setPhase] = useState<Phase>("booting");
  const [statusMessage, setStatusMessage] = useState("Hazırlanıyor…");

  const stopEverything = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      faceRef.current?.close();
    } catch {
      /* ignore */
    }
    try {
      poseRef.current?.close();
    } catch {
      /* ignore */
    }
    faceRef.current = null;
    poseRef.current = null;
  }, []);

  const applyOverlay = useCallback((anchor: NeckAnchor | null) => {
    const el = overlayRef.current;
    if (!el) return;
    if (!anchor) {
      el.style.opacity = "0";
      return;
    }
    const wPct = Math.min(98, Math.max(18, anchor.width * 100));
    el.style.opacity = "1";
    el.style.width = `${wPct}%`;
    el.style.left = `${anchor.x * 100}%`;
    el.style.top = `${anchor.y * 100}%`;
    el.style.clipPath = `inset(${NECKLACE_CLIP_TOP_PCT}% 0 0 0)`;
    el.style.transform = `translate(-50%, ${OVERLAY_TRANSLATE_Y_PCT}%) rotate(${anchor.rotation}rad)`;
    el.style.transformOrigin = "top center";
  }, []);

  const applySilhouetteGuide = useCallback(
    (
      sil: ReturnType<typeof fitBodySilhouette>,
      videoW: number,
      videoH: number,
      containerW: number,
      containerH: number,
    ) => {
      const path = guidePathRef.current;
      const pathGlow = guideGlowRef.current;
      const wrap = guideWrapRef.current;
      const leftDot = guideLeftDotRef.current;
      const rightDot = guideRightDotRef.current;
      if (!path || !wrap) return;
      if (!sil) {
        wrap.style.opacity = "0";
        return;
      }
      const map = (p: { x: number; y: number }) =>
        mapFittedPointToCover(p, videoW, videoH, containerW, containerH);
      const ls = map(sil.leftShoulder);
      const rs = map(sil.rightShoulder);
      const ng = map(sil.neckGuide);
      const tl = map(sil.torsoLeft);
      const tr = map(sil.torsoRight);
      const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
      const pt = (p: { x: number; y: number }) =>
        `${(clamp01(p.x) * 100).toFixed(2)} ${(clamp01(p.y) * 100).toFixed(2)}`;
      const d = [
        `M ${pt(ls)} L ${pt(rs)}`,
        `M ${pt(ls)} L ${pt(ng)} L ${pt(rs)}`,
        `M ${pt(ls)} L ${pt(tl)} L ${pt(tr)} L ${pt(rs)}`,
      ].join(" ");
      path.setAttribute("d", d);
      pathGlow?.setAttribute("d", d);
      if (leftDot) {
        leftDot.setAttribute("cx", (clamp01(ls.x) * 100).toFixed(2));
        leftDot.setAttribute("cy", (clamp01(ls.y) * 100).toFixed(2));
      }
      if (rightDot) {
        rightDot.setAttribute("cx", (clamp01(rs.x) * 100).toFixed(2));
        rightDot.setAttribute("cy", (clamp01(rs.y) * 100).toFixed(2));
      }
      wrap.style.opacity = "1";
    },
    [],
  );

  const loop = useCallback(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const face = faceRef.current;
    const pose = poseRef.current;
    if (!video || !face || !pose || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ts = performance.now();
    let faceLm: Array<{ x: number; y: number }> | null = null;
    let poseLm: Array<{ x: number; y: number; visibility?: number }> | null = null;
    try {
      const fr = face.detectForVideo(video, ts);
      faceLm = fr.faceLandmarks?.[0] ?? null;
    } catch {
      faceLm = null;
    }
    try {
      const pr = pose.detectForVideo(video, ts);
      poseLm = pr.landmarks?.[0] ?? null;
    } catch {
      poseLm = null;
    }

    const cw = stage?.clientWidth ?? 0;
    const ch = stage?.clientHeight ?? 0;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const silVideo = fitBodySilhouette({ poseLandmarks: poseLm, mirrorX: true });
    if (stage && cw > 0 && ch > 0) {
      applySilhouetteGuide(silVideo, vw, vh, cw, ch);
    }

    const rawVideo = computeNeckAnchor({
      faceLandmarks: faceLm,
      poseLandmarks: poseLm,
      mirrorX: true,
    });

    let raw: NeckAnchor | null = null;
    if (rawVideo && stage && cw > 0 && ch > 0) {
      const mapped = mapVideoNormToCoverContainer(rawVideo.x, rawVideo.y, vw, vh, cw, ch);
      const mappedW = mapVideoLengthToCoverContainerX(rawVideo.width, vw, vh, cw, ch);
      raw = { ...rawVideo, x: mapped.x, y: mapped.y, width: mappedW };
    }

    const smoothed = raw ? smoothAnchor(smoothedRef.current, raw) : null;
    if (smoothed) smoothedRef.current = smoothed;
    if (!raw) {
      applyOverlay(null);
      smoothedRef.current = null;
    } else {
      applyOverlay(smoothed);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [applyOverlay, applySilhouetteGuide]);

  useEffect(() => {
    let cancelled = false;

    async function createLandmarkers(vision: typeof import("@mediapipe/tasks-vision"), delegate: "GPU" | "CPU") {
      const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);
      const [face, pose] = await Promise.all([
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
        }),
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
      ]);
      return { face, pose };
    }

    async function start() {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        setStatusMessage("Bu cihazda kamera desteklenmiyor.");
        return;
      }

      try {
        // 1) Önce kamera — izin diyaloğu gecikmesin; video DOM'da hazır olsun
        setPhase("camera");
        setStatusMessage("Kamera izni isteniyor… Tarayıcı uyarısını kontrol et.");

        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "user" },
            },
          }),
          25_000,
          "Kamera",
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Video her zaman mount; bir frame bekle
        const video = await waitForVideoElement(() => videoRef.current);
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);

        // 2) Modeller (kamera açıkken)
        setPhase("models");
        setStatusMessage("Modeller yükleniyor… Birkaç saniye sürebilir.");

        const vision = await import("@mediapipe/tasks-vision");
        let face: Awaited<ReturnType<typeof createLandmarkers>>["face"];
        let pose: Awaited<ReturnType<typeof createLandmarkers>>["pose"];
        try {
          ({ face, pose } = await withTimeout(createLandmarkers(vision, "GPU"), 45_000, "Model (GPU)"));
        } catch (gpuErr) {
          console.warn("[tryon] GPU model failed, trying CPU", gpuErr);
          ({ face, pose } = await withTimeout(createLandmarkers(vision, "CPU"), 60_000, "Model (CPU)"));
        }

        if (cancelled) {
          face.close();
          pose.close();
          return;
        }

        faceRef.current = face as unknown as FaceLandmarker;
        poseRef.current = pose as unknown as PoseLandmarker;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = necklaceImageUrl;
        necklaceImgRef.current = img;

        setPhase("ready");
        setStatusMessage("");
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        const message = err instanceof Error ? err.message : String(err);
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPhase("denied");
          setStatusMessage(
            "Kamera izni verilmedi. Adres çubuğundaki kilit/kamera ikonundan izin verip tekrar dene.",
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setPhase("error");
          setStatusMessage("Kamera bulunamadı. Bir kamera bağlı olduğundan emin ol.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setPhase("error");
          setStatusMessage("Kamera başka bir uygulama tarafından kullanılıyor olabilir. Kapatıp tekrar dene.");
        } else {
          console.error("[tryon]", err);
          setPhase("error");
          setStatusMessage(
            message.includes("zaman aşımı")
              ? `${message} Sayfayı yenileyip tekrar dene.`
              : "Sanal deneme başlatılamadı. Bağlantını kontrol edip tekrar dene.",
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopEverything();
    };
  }, [loop, necklaceImageUrl, stopEverything]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const necklace = necklaceImgRef.current;
    const overlay = overlayRef.current;
    if (!video || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (necklace?.complete && overlay && overlay.style.opacity !== "0") {
      const leftPct = parseFloat(overlay.style.left) / 100;
      const topPct = parseFloat(overlay.style.top) / 100;
      const widthPct = parseFloat(overlay.style.width) / 100;
      const rotMatch = /rotate\(([-0-9.]+)rad\)/.exec(overlay.style.transform);
      const rotation = rotMatch ? Number(rotMatch[1]) : 0;
      const nw = widthPct * w;
      const nh = (necklace.naturalHeight / Math.max(1, necklace.naturalWidth)) * nw;
      const cx = leftPct * w;
      const cy = topPct * h;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      // Canlı overlay ile aynı: üst klips bandını kırp
      const clipTop = (NECKLACE_CLIP_TOP_PCT / 100) * nh;
      ctx.beginPath();
      ctx.rect(-nw / 2, clipTop + (OVERLAY_TRANSLATE_Y_PCT / 100) * nh, nw, nh - clipTop);
      ctx.clip();
      ctx.drawImage(necklace, -nw / 2, (OVERLAY_TRANSLATE_Y_PCT / 100) * nh, nw, nh);
      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zelula-tryon-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  const showStage = phase === "camera" || phase === "models" || phase === "ready" || phase === "booting";
  const showError = phase === "denied" || phase === "unsupported" || phase === "error";
  const busy = phase === "booting" || phase === "camera" || phase === "models";

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-stone-950/95 text-stone-100"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — üzerinde dene`}
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-100">{productName}</p>
          <p className="text-[11px] text-stone-400">Üzerinde dene · görüntü cihazında kalır</p>
        </div>
        <button
          type="button"
          onClick={() => {
            stopEverything();
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-600 bg-stone-900/80 px-3 py-1.5 text-xs font-medium text-stone-100 transition hover:bg-stone-800"
        >
          <X className="size-3.5" strokeWidth={1.8} aria-hidden />
          Kapat
        </button>
      </header>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-3 pb-4 sm:px-4">
        {showStage ? (
          <div
            ref={stageRef}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-stone-900 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- try-on overlay, local/CDN asset */}
            <img
              ref={overlayRef}
              src={necklaceImageUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute z-[1] max-w-none select-none will-change-transform"
              style={{
                opacity: 0,
                left: "50%",
                top: "50%",
                width: "40%",
                transform: `translate(-50%, ${OVERLAY_TRANSLATE_Y_PCT}%)`,
                transformOrigin: "top center",
                clipPath: `inset(${NECKLACE_CLIP_TOP_PCT}% 0 0 0)`,
              }}
            />
            <svg
              ref={guideWrapRef}
              className="pointer-events-none absolute inset-0 z-[3] h-full w-full transition-opacity duration-200"
              style={{ opacity: 0 }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                ref={guideGlowRef}
                fill="none"
                stroke="rgba(0, 0, 0, 0.45)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                ref={guidePathRef}
                fill="none"
                stroke="rgba(253, 246, 233, 0.95)"
                strokeWidth="1.6"
                strokeDasharray="6 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                ref={guideLeftDotRef}
                r="2.2"
                fill="#c9a86a"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="0.9"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                ref={guideRightDotRef}
                r="2.2"
                fill="#c9a86a"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="0.9"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {phase === "ready" ? (
              <p className="pointer-events-none absolute bottom-3 left-1/2 z-[4] w-[90%] -translate-x-1/2 rounded-full bg-stone-950/55 px-3 py-1.5 text-center text-[11px] text-stone-100 backdrop-blur-[2px]">
                Omuzlarını kesik çizgiye hizala
              </p>
            ) : null}
            {busy ? (
              <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center bg-stone-950/55 px-6 text-center backdrop-blur-[2px]">
                <Camera className="mb-3 size-9 text-stone-300" strokeWidth={1.4} aria-hidden />
                <p className="max-w-xs text-sm leading-relaxed text-stone-100">{statusMessage}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {showError ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-stone-700 bg-stone-900/80 px-6 py-16 text-center">
            <Camera className="mb-4 size-10 text-stone-500" strokeWidth={1.4} aria-hidden />
            <p className="max-w-sm text-sm leading-relaxed text-stone-300">{statusMessage}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full border border-stone-600 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800"
            >
              Geri dön
            </button>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleCapture}
              className="inline-flex items-center gap-2 rounded-full border border-[#d9ccb9]/50 bg-[#fdfbf8] px-5 py-2.5 text-sm font-medium text-stone-900 transition hover:bg-white"
            >
              <Camera className="size-4" strokeWidth={1.6} aria-hidden />
              Fotoğraf çek
            </button>
            <p className="text-center text-[11px] text-stone-500">
              Görüntü yalnızca cihazına iner; sunucuya gönderilmez.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
