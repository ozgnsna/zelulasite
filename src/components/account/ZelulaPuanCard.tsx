import {
  zelulaPuanPointsToNextTier,
  zelulaPuanProgressToNextTierPercent,
} from "@/lib/loyalty/compute";

export function ZelulaPuanCard({ availablePoints }: { availablePoints: number }) {
  const pts = Math.max(0, Math.floor(availablePoints));
  const withinCycle = pts % 100;
  const progress = zelulaPuanProgressToNextTierPercent(pts);
  const toNext = zelulaPuanPointsToNextTier(pts);
  const barPct = withinCycle === 0 && pts > 0 ? 100 : withinCycle;
  const isNearReward = toNext > 0 && toNext <= 20;

  return (
    <section
      id="zelula-puan"
      className="zl-shimmer zl-card scroll-mt-28 rounded-2xl border border-[#e2d5c4]/90 bg-gradient-to-b from-[#fcf8f1] via-[#f8f1e7] to-[#f2e8db] p-6 shadow-[inset_0_0_44px_rgba(232,201,139,0.12),0_16px_40px_rgba(62,52,38,0.06)] sm:p-8"
      aria-labelledby="zelula-puan-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#7a6a58]">Zelula Puanların</p>
          <h2 id="zelula-puan-heading" className="mt-2 font-serif text-2xl text-[#2c241c] sm:text-[1.65rem]">
            {pts.toLocaleString("tr-TR")}{" "}
            <span className="text-lg font-normal tracking-tight text-[#5c4f3d]">Zelula Puan</span>
          </h2>
        </div>
        <div
          className="mt-2 inline-flex items-center rounded-full border border-[#d4c4a8]/80 bg-white/50 px-3 py-1 text-[11px] font-medium tracking-wide text-[#6b5d4a] sm:mt-0"
          title="100 Zelula Puan = 50 TL ödeme adımında indirim"
        >
          100 puan ≈ 50 TL <span className="ml-1" aria-hidden>✨</span>
        </div>
      </div>

      <p className="mt-4 text-sm font-light leading-relaxed text-[#5a4f42]">
        Bir sonraki alışverişinde kullanabileceğin ayrıcalıkların burada birikir.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a7b6a]">
          <span>Sonraki ayrıcalığa</span>
          <span>{pts >= 100 && withinCycle === 0 ? "Hazır" : `${progress}/100`}</span>
        </div>
        <div
          className="hesabim-progress-track mt-2 h-1.5"
          role="progressbar"
          aria-valuenow={pts >= 100 ? 100 : progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`hesabim-progress-fill h-full transition-[width] duration-700 ease-out ${isNearReward ? "is-near" : ""}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      <p className="mt-5 text-sm font-light leading-relaxed text-[#4a4036]">
        {pts >= 100 ? (
          <>50 TL indirimin hazır. Ödeme adımında kullanabilirsin. <span aria-hidden>✨</span></>
        ) : (
          <>
            Bir sonraki avantaja <span className="font-semibold hesabim-gold-text">{toNext} puan</span> kaldı{" "}
            <span aria-hidden>✨</span>
          </>
        )}
      </p>

      <p className="mt-2 text-xs font-light leading-relaxed text-[#7d6f60]">
        Zelula puanların biriktikçe sana özel ayrıcalıklar açılır.
      </p>

      <p className="mt-4 text-[11px] font-light leading-relaxed text-[#8a7d6f]">
        Zelula Puan nakde çevrilemez; yalnızca ödeme adımında tanımlı koşullarla kullanılabilir.
      </p>
    </section>
  );
}
