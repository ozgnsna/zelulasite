"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Link2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { claimReferralFirstShareReward } from "@/app/actions/referral";
import { referralSmsShareBody, referralWhatsAppShareBody } from "@/lib/referral/share-copy";

export function ReferralInviteCard({
  referralLink,
  referralPointsEarned,
  referralFirstShareDone: _referralFirstShareDone,
  referredOrdersCount: _referredOrdersCount,
}: {
  referralLink: string;
  referralPointsEarned: number;
  referralFirstShareDone: boolean;
  referredOrdersCount: number;
  recentReferrals: string[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  void _referralFirstShareDone;
  void _referredOrdersCount;

  const runShareRewardThen = async (after: () => void) => {
    const r = await claimReferralFirstShareReward();
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    if ("awarded" in r && typeof r.awarded === "number") {
      toast.success(`+${r.awarded} Zelula Puan eklendi ✨`);
      router.refresh();
    }
    after();
  };

  const copyLink = () => {
    void runShareRewardThen(async () => {
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link kopyalandı ✨");
      } catch {
        toast.error("Link kopyalanamadı");
      }
    });
  };

  const shareWhatsApp = () => {
    const text = referralWhatsAppShareBody(referralLink);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    void runShareRewardThen(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const shareSms = () => {
    const body = encodeURIComponent(referralSmsShareBody(referralLink));
    void runShareRewardThen(() => {
      window.location.href = `sms:?body=${body}`;
    });
  };

  const primaryBtnClass =
    "inline-flex flex-1 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-xl border border-[#c9ab73]/85 bg-[linear-gradient(135deg,#e9d2a5_0%,#d9b87b_100%)] px-3 py-2.5 text-[11px] font-semibold text-[#352b21] shadow-[0_8px_22px_rgba(198,161,91,0.25)] transition hover:scale-[1.025] hover:brightness-[0.98] hover:shadow-[0_0_0_1px_rgba(217,184,123,0.4),0_16px_30px_rgba(198,161,91,0.34)] active:scale-[0.97] active:shadow-[0_5px_14px_rgba(198,161,91,0.2)] sm:text-xs";
  const outlineBtnClass =
    "inline-flex flex-1 min-w-[7.5rem] items-center justify-center rounded-xl border border-[#d8c7ac]/75 bg-[linear-gradient(135deg,#faf6ef_0%,#fffdfb_100%)] px-3 py-2.5 text-[11px] font-medium text-[#3d342c] shadow-[0_5px_16px_rgba(198,161,91,0.1)] transition hover:border-[#c6a15b]/55 hover:shadow-[0_8px_20px_rgba(198,161,91,0.16)] sm:text-xs";

  return (
    <section className="zl-card relative overflow-hidden rounded-2xl border border-[#e4d9c8]/90 bg-[linear-gradient(165deg,#fffdfb_0%,#faf6ef_48%,#f7f0e6_100%)] p-6 shadow-[0_12px_32px_rgba(62,53,42,0.07)] sm:p-7">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(232,201,139,0.22),transparent_70%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="rounded-2xl border border-[#e6d8c1]/90 bg-[linear-gradient(160deg,#fffdfa_0%,#faf4ea_100%)] p-4 shadow-[0_10px_24px_rgba(62,53,42,0.07)] sm:p-5">
          <div className="flex items-start gap-2">
            <h2 className="font-serif text-xl text-stone-900 sm:text-[1.35rem]">Paylaş, kazanmaya başla ✨</h2>
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#c6a15b]/80" strokeWidth={1.35} aria-hidden />
          </div>
          <p className="mt-2 text-sm font-light leading-relaxed text-stone-700">
            Paylaştıkça kazanmaya başlarsın.
          </p>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {[
            { title: "Paylaş", desc: "Linkini gönder", icon: Link2 },
            { title: "Arkadaşın alışveriş yapar", desc: "İlk siparişi tamamlanır", icon: CheckCircle2 },
            { title: "Sen kazanırsın", desc: "+50 Zelula Puan kazan ✨", icon: Sparkles },
          ].map((step) => (
            <div
              key={step.title}
              className={`rounded-xl p-3 ${
                step.title === "Sen kazanırsın"
                  ? "border border-[#d5b57f]/95 bg-[linear-gradient(155deg,#fdf6e8_0%,#f7ebd7_100%)] shadow-[0_10px_24px_rgba(185,143,73,0.16)]"
                  : "border border-[#e7dac4]/90 bg-[#fffcf7]/95 shadow-[0_6px_18px_rgba(63,51,35,0.06)]"
              }`}
            >
              <step.icon className="size-4 text-[#b8945f]" strokeWidth={1.5} aria-hidden />
              <p className="mt-2 text-[12px] font-medium leading-snug text-stone-900">{step.title}</p>
              {step.title === "Sen kazanırsın" ? (
                <p className="mt-1 text-[11px] font-light leading-relaxed text-stone-700">
                  <span className="rounded-md bg-[#f4e7cf] px-1.5 py-0.5 text-[20px] font-bold tracking-tight text-[#9f7640]">
                    +50
                  </span>{" "}
                  Zelula Puan kazan ✨
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-light leading-relaxed text-stone-600">{step.desc}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#e5d6bf]/90 bg-[#fffdf9]/95 p-4 shadow-[0_10px_24px_rgba(62,53,42,0.06)]">
          {referralPointsEarned > 0 ? (
            <>
              <p className="text-[13px] font-light leading-relaxed text-stone-800">
                Davetlerin sayesinde{" "}
                <span className="font-medium tabular-nums text-[#b8945f]">{referralPointsEarned.toLocaleString("tr-TR")}</span>{" "}
                puan kazandın ✨
              </p>
              <p className="mt-1 text-[12px] font-light leading-relaxed text-stone-600">
                Biriken puan:{" "}
                <span className="font-medium tabular-nums text-[#a8844f]">{referralPointsEarned.toLocaleString("tr-TR")}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-light leading-relaxed text-stone-800">İlk kazancını yapmaya başla ✨</p>
              <p className="mt-1 text-[12px] font-light leading-relaxed text-stone-600">İlk paylaşımını yaparak başla ✨</p>
              <p className="mt-1 inline-flex rounded-md border border-[#e3d0ad]/80 bg-[#fbf4e8] px-2 py-1 text-[12px] font-normal leading-relaxed text-[#9f7640]">
                🎁 İlk paylaşımına +20 bonus kazan
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-[#e4d4bb]/90 bg-[linear-gradient(160deg,#fffdfa_0%,#f9f2e7_100%)] p-4 shadow-[0_12px_28px_rgba(62,53,42,0.08)]">
          <p className="text-[12px] font-light leading-relaxed text-stone-700">Bugün paylaşılan davetler daha hızlı dönüşür ✨</p>
          <p className="text-[12px] font-light leading-relaxed text-stone-700">Linkini paylaş, kazanmaya başla</p>
          <p className="text-[11px] font-medium tracking-[0.04em] text-stone-500">Paylaşım linkin</p>
          <div className="mt-2 rounded-xl border border-[#e8dcc9]/90 bg-white/75 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <p className="break-all text-[11px] font-light leading-relaxed text-stone-600 sm:text-xs">{referralLink}</p>
          </div>
          <p className="mt-1.5 text-[11px] font-light leading-relaxed text-stone-500">Kopyala → WhatsApp&apos;a yapıştır → gönder</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={shareWhatsApp} className={primaryBtnClass}>
              🟢 WhatsApp paylaş
            </button>
            <button type="button" onClick={copyLink} className={outlineBtnClass}>
              {copied ? "Link kopyalandı ✨" : "Link kopyala"}
            </button>
            <button type="button" onClick={shareSms} className={outlineBtnClass}>
              Mesaj gönder
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium leading-relaxed text-stone-700">
            <Users className="size-3.5 shrink-0 text-stone-600" strokeWidth={1.6} aria-hidden />
            Son 24 saatte 38 kişi Zelula&apos;yı davet etti
          </p>
        </div>
      </div>
    </section>
  );
}
