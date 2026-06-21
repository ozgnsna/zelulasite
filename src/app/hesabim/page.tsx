import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserLoyaltyBalance } from "@/lib/loyalty/balance";
import { HesabimInstagramCard } from "@/components/account/HesabimInstagramCard";
import { ZelulaPuanCard } from "@/components/account/ZelulaPuanCard";
import { OrdersList } from "@/components/account/OrdersList";
import { ProfileSection } from "@/components/account/ProfileSection";
import { SignOutForm } from "@/components/account/SignOutForm";
import { ReferralInviteCard } from "@/components/account/ReferralInviteCard";
import { SavedAddressesManager } from "@/components/account/SavedAddressesManager";
import { AccountFavoritesSection } from "@/components/account/AccountFavoritesSection";
import { ensureUserReferralCode } from "@/lib/referral/server";
import { listSavedAddressesForUser } from "@/lib/account/saved-addresses";
import { normalizeTurkishFullName } from "@/lib/account/turkish-full-name";

export const metadata: Metadata = {
  title: "Hesabım",
  description: "Siparişleriniz ve profil bilgileriniz.",
};

function resolveAccountDisplayName(
  profileName: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
) {
  const fromProfile = normalizeTurkishFullName(String(profileName ?? ""));
  if (fromProfile) return fromProfile;
  return normalizeTurkishFullName(String(userMetadata?.full_name ?? ""));
}

function maskReferralPerson(name: string | null, email: string | null) {
  const cleanName = (name ?? "").trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const lastInitial = parts[parts.length - 1]?.charAt(0).toUpperCase();
      if (lastInitial) return `${first} ${lastInitial}.`;
    }
    return cleanName;
  }

  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (cleanEmail.includes("@")) {
    const [local, domain] = cleanEmail.split("@");
    if (local && domain) {
      const first = local.charAt(0);
      return `${first}***@${domain}`;
    }
  }
  return "Zelula misafiri";
}

export default async function HesabimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/hesabim")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, birth_date, referral_first_share_rewarded_at")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = resolveAccountDisplayName(profile?.full_name, user.user_metadata);
  const displayGreeting = fullName;
  const birthSlice =
    profile?.birth_date != null ? String(profile.birth_date).slice(0, 10) : null;

  const loyaltyBalance = await getUserLoyaltyBalance(supabase, user.id);
  const pointsToNextReward = Math.max(0, 100 - loyaltyBalance);
  const progressToNextReward = Math.min(100, Math.max(0, Math.round((loyaltyBalance / 100) * 100)));
  const estimatedDiscountTl = Math.floor(loyaltyBalance / 2);
  const admin = createAdminClient();
  const referralCode = await ensureUserReferralCode(admin, user.id);
  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/urunler?ref=${referralCode ?? ""}`;
  const savedAddresses = await listSavedAddressesForUser(supabase, user.id);
  const { data: referralRows } = await admin
    .from("loyalty_points_ledger")
    .select("points")
    .eq("user_id", user.id)
    .eq("type", "referral_earned");
  const referralPointsEarned = (referralRows ?? []).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const { count: referredOrdersCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", user.id)
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled");
  const { data: recentReferredOrders } = await admin
    .from("orders")
    .select("customer_name,email")
    .eq("referrer_user_id", user.id)
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(3);
  const recentReferrals = (recentReferredOrders ?? []).map((o) =>
    maskReferralPerson(o.customer_name ?? null, o.email ?? null),
  );

  return (
    <main className="hesabim-page-main container-premium scroll-smooth pb-20 pt-12 sm:pt-16">
      <div className="relative z-[1] mx-auto max-w-3xl">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.24em] text-stone-500">Hesabım</p>

        <section className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">Kazan</p>
          <div className="zl-divider mt-2" />
        </section>

        <section className="hesabim-hero-card mt-4 p-6 sm:p-8">
          <h1 className="text-center font-serif text-2xl text-stone-900 sm:text-3xl">
            {displayGreeting ? `Hoş geldin ${displayGreeting} ✨` : "Hoş geldin ✨"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-stone-600">
            Bugün kazanmaya başla ✨
          </p>
          <div className="mx-auto mt-4 max-w-sm rounded-xl border border-[#e7dbc8]/85 bg-white/60 px-4 py-3 text-center shadow-[0_8px_22px_rgba(62,53,42,0.06)]">
            <p className="text-base font-semibold text-[#9f7640]">
              {loyaltyBalance.toLocaleString("tr-TR")} Puan
            </p>
            <p className="mt-1 text-[11px] font-medium text-stone-600">Hazır indirim bakiyen</p>
            <p className="mt-1 text-xs text-stone-600">≈ {estimatedDiscountTl.toLocaleString("tr-TR")} TL indirim</p>
            <div className="mt-3 rounded-lg border border-[#eadfcf]/85 bg-[#fff9f0]/80 px-3 py-2.5 text-left">
              <p className="text-[13px] font-semibold text-[#9f7640]">Bu ödüle çok az kaldı ✨</p>
              <p className="text-[11px] font-medium text-stone-700">100 puana {pointsToNextReward} kaldı</p>
              <div className="hesabim-progress-track mt-2 h-2 w-full">
                <div
                  className={`hesabim-progress-fill h-full ${pointsToNextReward <= 20 ? "is-near" : ""}`}
                  style={{ width: `${progressToNextReward}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <a
              href="#davet-et"
              className="block rounded-xl border border-[#cda96d]/85 bg-[linear-gradient(135deg,#ead4aa_0%,#d9b87b_100%)] px-3 py-2.5 text-center shadow-[0_10px_22px_rgba(198,161,91,0.24)] transition hover:brightness-[0.98]"
            >
              <p className="text-[13px] font-semibold text-[#352b21]">Puan kazan</p>
              <p className="mt-0.5 text-[10px] font-medium text-[#5b4832]">Görevleri gör →</p>
            </a>
            <Link
              href="/urunler"
              className="hesabim-tile block rounded-xl border border-[#e5d8c5]/90 bg-white/70 px-3 py-2.5 text-center"
            >
              <p className="text-[13px] font-medium text-stone-800">Koleksiyonu keşfet</p>
            </Link>
            <a
              href="#davet-et"
              className="hesabim-tile block rounded-xl border border-[#e5d8c5]/90 bg-white/70 px-3 py-2.5 text-center"
            >
              <p className="text-[13px] font-medium text-stone-800">Davet et</p>
            </a>
          </div>
        </section>

        <p className="mt-6 text-center text-sm font-bold text-stone-800">
          İlk kazancını başlat 👇
        </p>

        <section
          id="davet-et"
          className="scroll-mt-28 mt-4 rounded-3xl border border-[#d5ba92] bg-white/50 p-2 shadow-[0_0_0_1px_rgba(213,186,146,0.3),0_22px_44px_rgba(62,53,42,0.14)] sm:mt-6 sm:p-3"
        >
          <ReferralInviteCard
            referralLink={referralLink}
            referralPointsEarned={referralPointsEarned}
            referralFirstShareDone={!!profile?.referral_first_share_rewarded_at}
            referredOrdersCount={Number(referredOrdersCount ?? 0)}
            recentReferrals={recentReferrals}
          />
        </section>

        <section className="mt-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Alışveriş</p>
          <div className="zl-divider mt-2" />
        </section>

        <section id="siparisler" className="scroll-mt-28 mt-6 opacity-[0.93]">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-serif text-xl text-stone-900 sm:text-2xl">Siparişlerim</h2>
          </div>
          <Suspense fallback={<p className="text-sm text-stone-500">Siparişler yükleniyor…</p>}>
            <OrdersList />
          </Suspense>
        </section>

        <section id="hesap" className="mt-12 scroll-mt-28">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Hesap</p>
          <div className="zl-divider mt-2" />
        </section>

        <nav
          className="mt-6 grid gap-3 opacity-[0.95] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
          aria-label="Hesap bölümleri"
        >
          <a
            href="#siparisler"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">📦</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Siparişlerim</p>
            <p className="mt-1 text-sm text-stone-600">Geçmiş ve güncel siparişler</p>
          </a>
          <a
            href="#profil"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">🪞</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Profil bilgilerim</p>
            <p className="mt-1 text-sm text-stone-600">Ad, telefon, doğum günü</p>
          </a>
          <a
            href="#adreslerim"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">📍</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Adreslerim</p>
            <p className="mt-1 text-sm text-stone-600">Kayıtlı teslimat adresleri</p>
          </a>
          <a
            href="#favorilerim"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">🤍</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Favorilerim</p>
            <p className="mt-1 text-sm text-stone-600">Beğendiğin ürünler</p>
          </a>
          <a
            href="#ayricaliklar"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">✨</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Zelula ayrıcalıklarım</p>
            <p className="mt-1 text-sm text-stone-600">Instagram ve özel fırsatlar</p>
          </a>
          <a
            href="#zelula-puan"
            className="hesabim-tile block border-[#f1ebe3]/80 bg-[linear-gradient(180deg,#fffdfb_0%,#faf8f4_100%)] shadow-[0_6px_16px_rgba(62,52,38,0.04)] p-4 text-left sm:p-5"
          >
            <p className="hesabim-tile-icon text-base">💫</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Zelula Puanların</p>
            <p className="mt-1 text-sm text-stone-600">Biriken ayrıcalıkların</p>
          </a>
        </nav>

        <div className="mt-12 scroll-mt-28" id="profil">
          <ProfileSection
            email={user.email ?? ""}
            initialFullName={fullName}
            initialPhone={profile?.phone ?? null}
            initialBirthDate={birthSlice}
          />
        </div>

        <div className="mt-12">
          <SavedAddressesManager initialAddresses={savedAddresses} />
        </div>

        <div className="mt-12">
          <AccountFavoritesSection />
        </div>

        <div className="mt-12">
          <ZelulaPuanCard availablePoints={loyaltyBalance} />
        </div>

        <div className="mt-12">
          <HesabimInstagramCard />
        </div>

        <SignOutForm />

        <p className="mt-10 text-center text-sm text-stone-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Alışverişe devam et
          </Link>
        </p>
      </div>
    </main>
  );
}
