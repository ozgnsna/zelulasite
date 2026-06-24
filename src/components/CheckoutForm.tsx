"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { previewGiftCard } from "@/app/actions/gift-card-redeem";
import { createCheckout, previewPromoDiscount } from "@/app/actions/store";
import type { AnalyticsItem } from "@/lib/analytics";
import { trackBeginCheckout, trackCouponUsage, trackInstagramClick } from "@/lib/analytics";
import { formatTry } from "@/lib/money";
import { ZELULA_PUAN_PER_100_TRY } from "@/lib/loyalty/constants";
import type { SavedAddress } from "@/lib/types";
import { getDistrictOptions, TURKIYE_CITIES } from "@/lib/turkiye-addresses";
import Link from "next/link";
import { CheckoutLegalModal } from "@/components/checkout/CheckoutLegalModal";
import { PaymentTrustStrip } from "@/components/payments/PaymentTrustStrip";
import {
  getDistanceSalesContractText,
  getPreContractInfoText,
  getPrivacyPolicyText,
} from "@/lib/legal/legal-content";

const EMPTY_SAVED_ADDRESSES: SavedAddress[] = [];

const CHECKOUT_CLIENT_HANDOFF_DEBUG = process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1";

export function CheckoutForm({
  disabled,
  items,
  subtotal,
  shippingCost,
  shippingRemaining,
  promoCampaignActive,
  instagramUsername,
  instagramProfileHref,
  lineCount,
  isSignedIn,
  accountEmail,
  accountFullName,
  accountPhone,
  loyaltyAvailablePoints,
  savedAddresses: savedAddressesProp,
}: {
  disabled?: boolean;
  items: AnalyticsItem[];
  subtotal: number;
  shippingCost: number;
  shippingRemaining: number;
  promoCampaignActive: boolean;
  instagramUsername: string;
  instagramProfileHref: string;
  lineCount: number;
  isSignedIn: boolean;
  accountEmail: string | null;
  accountFullName: string | null;
  accountPhone: string | null;
  loyaltyAvailablePoints: number;
  savedAddresses?: SavedAddress[] | null;
}) {
  type CheckoutSuccessFallback = {
    orderNumber: string;
    href: string;
    email: string;
  };
  const savedList = useMemo(
    () => (savedAddressesProp == null ? EMPTY_SAVED_ADDRESSES : savedAddressesProp),
    [savedAddressesProp],
  );
  const firstSaved = useMemo(
    () => savedList.find((a) => a.is_default) ?? savedList[0],
    [savedList],
  );

  const [pending, start] = useTransition();
  const [previewing, startPreview] = useTransition();
  const [giftPreviewing, startGiftPreview] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [legalAcceptWarning, setLegalAcceptWarning] = useState<string | null>(null);
  const [acceptDistanceSales, setAcceptDistanceSales] = useState(false);
  const [acceptPreContractInfo, setAcceptPreContractInfo] = useState(false);
  const [acceptKvkkConsent, setAcceptKvkkConsent] = useState(false);
  const [successHint, setSuccessHint] = useState<string | null>(null);
  const [successFallback, setSuccessFallback] = useState<CheckoutSuccessFallback | null>(null);
  /** `NEXT_PUBLIC_CHECKOUT_DEBUG=1` iken sunucunun döndürdüğü `r.url` (yalnızca geçerli yönlendirme öncesi). */
  const [checkoutHandoffUrlDebug, setCheckoutHandoffUrlDebug] = useState<string | null>(null);
  const [promoDraft, setPromoDraft] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    percent: number;
  } | null>(null);
  const [giftDraft, setGiftDraft] = useState("");
  const [giftError, setGiftError] = useState<string | null>(null);
  const [appliedGift, setAppliedGift] = useState<{
    amountApplied: number;
    last4: string;
    balanceRemaining: number;
  } | null>(null);
  const [useLoyaltyRedeem, setUseLoyaltyRedeem] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [invoiceType, setInvoiceType] = useState<"individual" | "sole" | "company">("individual");
  const [invoiceSameAsDelivery, setInvoiceSameAsDelivery] = useState(true);
  const [tcIdentityNo, setTcIdentityNo] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [pickedId, setPickedId] = useState<string>(() => (firstSaved ? firstSaved.id : "new"));
  const [dName, setDName] = useState(() =>
    (firstSaved?.recipient_name ?? (accountFullName ?? "").trim()).trim(),
  );
  const [dPhone, setDPhone] = useState(() => (firstSaved?.phone ?? (accountPhone ?? "").trim()).trim());
  const [dLine, setDLine] = useState(() => firstSaved?.address_line ?? "");
  const [dPostal, setDPostal] = useState(() => firstSaved?.postal_code ?? "");
  const [city, setCity] = useState(() => firstSaved?.city ?? "");
  const [district, setDistrict] = useState(() => firstSaved?.district ?? "");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [invoiceDistrict, setInvoiceDistrict] = useState("");
  const legalSectionRef = useRef<HTMLElement | null>(null);
  const formRootRef = useRef<HTMLFormElement | null>(null);
  const [legalModal, setLegalModal] = useState<"distance" | "pre" | "privacy" | null>(null);

  const legalModalConfig = useMemo(() => {
    if (legalModal === "distance") {
      return { title: "Mesafeli Satış Sözleşmesi", text: getDistanceSalesContractText() };
    }
    if (legalModal === "pre") {
      return { title: "Ön Bilgilendirme Formu", text: getPreContractInfoText() };
    }
    if (legalModal === "privacy") {
      return { title: "Gizlilik Politikası", text: getPrivacyPolicyText() };
    }
    return null;
  }, [legalModal]);

  const applySavedAddressPick = useCallback(
    (nextId: string) => {
      setPickedId(nextId);
      const nm = (accountFullName ?? "").trim();
      const ph = (accountPhone ?? "").trim();
      if (nextId === "new") {
        setDName(nm);
        setDPhone(ph);
        setDLine("");
        setDPostal("");
        setCity("");
        setDistrict("");
        return;
      }
      const row = savedList.find((x) => x.id === nextId);
      if (!row) {
        setPickedId("new");
        setDName(nm);
        setDPhone(ph);
        setDLine("");
        setDPostal("");
        setCity("");
        setDistrict("");
        return;
      }
      setDName(row.recipient_name);
      setDPhone(row.phone);
      setDLine(row.address_line);
      setDPostal(row.postal_code);
      setCity(row.city);
      setDistrict(row.district);
    },
    [savedList, accountFullName, accountPhone],
  );

  const loyaltyTryValue = Math.max(0, loyaltyAvailablePoints * 0.5);
  const loyaltyCartCap = Math.max(0, subtotal * 0.5);
  const loyaltyDiscount = useLoyaltyRedeem && isSignedIn ? Math.min(loyaltyTryValue, loyaltyCartCap, subtotal) : 0;
  const subtotalAfterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const orderTotalBeforeGift = Math.max(0, subtotalAfterLoyalty - promoDiscount);
  const giftDiscount = appliedGift?.amountApplied ?? 0;
  const payable = Math.max(0, orderTotalBeforeGift - giftDiscount);
  const earnedPointsPreview = Math.floor(payable / 100) * ZELULA_PUAN_PER_100_TRY;
  const hasLoyaltyPoints = isSignedIn && loyaltyAvailablePoints > 0;
  const resolvedAccountName = (accountFullName ?? "").trim();
  const resolvedAccountPhone = (accountPhone ?? "").trim();
  const resolvedAccountEmail = (accountEmail ?? "").trim();
  const showPhoneFieldForSignedIn = isSignedIn && !resolvedAccountPhone;
  const showEmailField = !resolvedAccountEmail;
  const showPhoneField = !isSignedIn || showPhoneFieldForSignedIn;
  const legalAllAccepted = acceptDistanceSales && acceptPreContractInfo && acceptKvkkConsent;
  const submitDisabled = Boolean(disabled || pending || !legalAllAccepted);

  return (
    <>
      <form
        id="checkout-form"
        ref={formRootRef}
        className="checkout-panel zl-shimmer flex flex-col rounded-2xl border border-[#e8dccb]/90 bg-[linear-gradient(180deg,#fffdfb_0%,#fbf8f3_100%)] shadow-[0_12px_30px_rgba(62,52,38,0.08)]"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSuccessHint(null);
          const fd = new FormData(e.currentTarget);
          if (
            fd.get("accept_distance_sales") !== "on" ||
            fd.get("accept_pre_contract_info") !== "on" ||
            fd.get("kvkk_consent") !== "on"
          ) {
            setLegalAcceptWarning(
              "Devam etmek için mesafeli satış sözleşmesi, ön bilgilendirme formu ve gizlilik politikasını onaylamalısınız.",
            );
            legalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          setLegalAcceptWarning(null);
          setCheckoutHandoffUrlDebug(null);
          trackBeginCheckout(items);
          start(async () => {
            const r = await createCheckout(fd);
            const pmField = String(fd.get("payment_method") ?? "").trim();
            const isCardPayment = pmField === "card";
            if (CHECKOUT_CLIENT_HANDOFF_DEBUG) {
              console.info("[checkout] createCheckout response", {
                ok: Boolean(r?.ok),
                url: r && "url" in r ? r.url : undefined,
                fallbackUrl: r && "fallbackUrl" in r ? r.fallbackUrl : undefined,
                paymentMethodField: pmField || "(missing)",
                responsePaymentMethod: r && "paymentMethod" in r ? r.paymentMethod : undefined,
                orderId: r && "orderId" in r ? r.orderId : undefined,
                orderNumber: r && "orderNumber" in r ? r.orderNumber : undefined,
                error: r && "error" in r ? r.error : undefined,
                note: "Navigasyon yalnızca r.url ile yapılır; fallbackUrl yalnızca yedek Link href içindir.",
              });
            }
            if (r?.ok && r.url) {
              const urlStr = String(r.url).trim();
              if (isCardPayment) {
                console.info("[checkout] card checkout r.url:", urlStr);
              }
              const allowMockHandoff =
                process.env.NODE_ENV !== "production" && urlStr.includes("/odeme/qnb-mock");
              if (isCardPayment && !urlStr.includes("/odeme/paytr-baslat/") && !allowMockHandoff) {
                console.error("[checkout] blocked card navigation: expected /odeme/paytr-baslat/", {
                  rUrl: urlStr,
                  orderId: "orderId" in r ? r.orderId : undefined,
                });
                setSuccessHint(null);
                setSuccessFallback(null);
                setCheckoutHandoffUrlDebug(CHECKOUT_CLIENT_HANDOFF_DEBUG ? urlStr : null);
                setError("Ödeme sayfası başlatılamadı. Lütfen tekrar deneyin.");
                formRootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              if ("payFlowDebugSnapshot" in r && r.payFlowDebugSnapshot && typeof r.payFlowDebugSnapshot === "object") {
                console.info("[payments] Checkout client handoff.", r.payFlowDebugSnapshot);
              }
              const orderNumber = typeof r.orderNumber === "string" && r.orderNumber.trim() ? r.orderNumber : "—";
              const fallbackHref =
                (typeof r.fallbackUrl === "string" && r.fallbackUrl.trim()) ||
                (typeof r.url === "string" && r.url.trim()) ||
                (typeof r.orderId === "string" && r.orderId.trim()
                  ? `/siparis/${r.orderId}/basarili?pm=bank_transfer`
                  : "/siparis-basarili");
              const formEmail = String(fd.get("email") ?? "").trim();
              setSuccessFallback({
                orderNumber,
                href: fallbackHref,
                email: formEmail || resolvedAccountEmail || "—",
              });
              setSuccessHint("Siparişiniz alındı, yönlendiriliyorsunuz...");
              if (CHECKOUT_CLIENT_HANDOFF_DEBUG) {
                setCheckoutHandoffUrlDebug(urlStr);
                console.info("[checkout] window.location.href assign", { target: urlStr });
              }
              window.location.href = urlStr;
            } else {
              setError(r?.error ?? "İşlem başlatılamadı.");
              formRootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
        }}
      >
        <div className="form-area flex flex-col space-y-6 px-6 pt-8 pb-24 sm:px-8 sm:pt-9 lg:px-7 lg:pb-6">
          <section>
            <h2 className="text-lg font-medium text-stone-900">Özet</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <dt>Ürün ({lineCount})</dt>
                <dd className="tabular-nums">{formatTry(subtotal)}</dd>
              </div>
              {loyaltyDiscount > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <dt>Puan indirimi</dt>
                  <dd className="tabular-nums">-{formatTry(loyaltyDiscount)}</dd>
                </div>
              ) : null}
              {promoDiscount > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <dt>Promo indirimi</dt>
                  <dd className="tabular-nums">-{formatTry(promoDiscount)}</dd>
                </div>
              ) : null}
              {giftDiscount > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <dt>Hediye kartı{appliedGift?.last4 ? ` ····${appliedGift.last4}` : ""}</dt>
                  <dd className="tabular-nums">-{formatTry(giftDiscount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-stone-600">
                <dt>Kargo</dt>
                <dd className="tabular-nums">{shippingCost === 0 ? "Ücretsiz" : formatTry(shippingCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#e8dccb] pt-3 text-xl font-semibold text-stone-900">
                <dt>Toplam</dt>
                <dd className="tabular-nums">{formatTry(payable)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] font-medium text-[#7a5f38]">
              {shippingRemaining > 0
                ? `Sadece ${formatTry(shippingRemaining)} daha ekle → ücretsiz kargo`
                : "Ücretsiz kargo aktif"}
            </p>
            <p className="mt-1 text-[12px] text-stone-600">Bu alışverişten +{earnedPointsPreview} Zelula Puan kazanacaksın ✨</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-800">💳 Ödeme Türü</h3>
            <input type="hidden" name="payment_method" value={paymentMethod} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  paymentMethod === "card"
                    ? "border-[#c6a15b] bg-[#faf4ea] text-stone-900 shadow-[0_1px_6px_rgba(198,161,91,0.2)]"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <p className="font-semibold">Banka/Kredi Kartı</p>
                <p className="mt-1 text-xs text-stone-500">Güvenli ödeme sağlayıcısı üzerinden online ödeme.</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("bank_transfer")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  paymentMethod === "bank_transfer"
                    ? "border-[#c6a15b] bg-[#faf4ea] text-stone-900 shadow-[0_1px_6px_rgba(198,161,91,0.2)]"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                <p className="font-semibold">Havale / EFT</p>
                <p className="mt-1 text-xs text-stone-500">Sipariş sonrası IBAN bilgisi ile manuel transfer.</p>
              </button>
            </div>
            {paymentMethod === "bank_transfer" ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                Havale/EFT seçiminde siparişin oluşturulur; ödeme onayı admin panelinden işlenir.
              </p>
            ) : (
              <PaymentTrustStrip variant="checkout" />
            )}
          </section>

          {resolvedAccountEmail ? (
            <section>
              <p className="text-[12px] text-stone-600">
                Sipariş e-postası: <span className="font-medium text-stone-800">{resolvedAccountEmail}</span>
              </p>
              <input type="hidden" name="email" value={resolvedAccountEmail} />
            </section>
          ) : null}

          <div className="space-y-5">
            <section className="space-y-5">
              <h3 className="text-sm font-semibold text-stone-800">📍 Teslimat Adresi</h3>
              {isSignedIn && savedList.length > 0 ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Kayıtlı adres seç</label>
                  <select
                    value={pickedId}
                    onChange={(e) => applySavedAddressPick(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
                  >
                    <option value="new">— Yeni adres gir —</option>
                    {savedList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                        {a.is_default ? " (varsayılan)" : ""}: {a.district}, {a.city}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
          {showEmailField ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">E-posta</label>
              <input
                id="checkout-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="siz@ornek.com"
                disabled={disabled || pending}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                onInvalid={(e) => e.currentTarget.setCustomValidity("Geçerli bir e-posta adresi girin.")}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">Alıcı Ad Soyad</label>
            <input
              name="customer_name"
              autoFocus
              autoComplete="name"
              value={dName}
              onChange={(e) => setDName(e.target.value)}
              placeholder="Alıcı Ad Soyad"
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
              onInvalid={(e) => e.currentTarget.setCustomValidity("Lütfen ad soyad bilgisi girin.")}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
            />
          </div>
          {showPhoneField ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Telefon</label>
              <input
                name="phone"
                autoComplete="tel"
                placeholder="Telefon"
                required
                value={dPhone}
                onChange={(e) => setDPhone(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
                onInvalid={(e) => e.currentTarget.setCustomValidity("Lütfen telefon numaranızı girin.")}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
              />
            </div>
          ) : null}
          {isSignedIn && !showPhoneField ? <input type="hidden" name="phone" value={dPhone} readOnly /> : null}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">İl</label>
              <select
                name="city"
                autoComplete="address-level1"
                required
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setDistrict("");
                }}
                className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
              >
                <option value="">İl seçiniz</option>
                {TURKIYE_CITIES.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">İlçe</label>
              <select
                name="district"
                autoComplete="address-level2"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!city}
                className="h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-3 text-[13px] text-stone-900 transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
              >
                <option value="">{city ? "İlçe seçin" : "İlçe"}</option>
                {getDistrictOptions(city).map((districtOption) => (
                  <option key={districtOption} value={districtOption}>
                    {districtOption}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 xl:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-stone-600">Posta Kodu</label>
              <input
                name="postal_code"
                autoComplete="postal-code"
                placeholder="Posta Kodu"
                required
                value={dPostal}
                onChange={(e) => setDPostal(e.target.value)}
                className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-xs transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
              />
            </div>
          </div>
          {!city ? <p className="-mt-2 text-[11px] text-stone-500">İlçe seçimi için önce il seçmelisin.</p> : null}
          <p className="-mt-2 text-[11px] text-stone-500">
            Posta kodunu bilmiyor musun?{" "}
            <a
              href="https://postakodu.ptt.gov.tr/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#8b6a3f] underline decoration-[#c6a15b]/70 underline-offset-2 hover:text-[#6f5432]"
            >
              PTT&apos;den bul
            </a>
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">Açık Adres</label>
            <textarea
              name="address_line"
              autoComplete="street-address"
              placeholder="Mahalle, sokak, bina no, daire vb."
              required
              rows={3}
              maxLength={500}
              value={dLine}
              onChange={(e) => setDLine(e.target.value)}
              className="min-h-[96px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
            />
            <p className="mt-1 text-[11px] text-stone-500">Yazdığın adresi burada görebilirsin (maks. 500 karakter).</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-600">Teslimat Notu (Opsiyonel)</label>
            <textarea
              name="delivery_note"
              rows={2}
              maxLength={300}
              placeholder="Örn: Zilim çalışmıyor, bahçede köpek var, evde hasta var."
              className="min-h-[84px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-[#C6A15B] focus:outline-none focus:ring-2 focus:ring-[#e8c98b]/35"
            />
            <p className="mt-1 text-[11px] text-stone-500">Kurye için kısa bir not bırakabilirsin (maks. 300 karakter).</p>
          </div>
              {isSignedIn && pickedId === "new" ? (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#ebe6df] bg-[#faf8f5]/80 px-3 py-2.5 text-sm text-stone-700">
                  <input type="checkbox" name="save_address" className="mt-0.5 rounded border-stone-300" />
                  <span>Bu teslimat adresini hesabıma kaydet</span>
                </label>
              ) : null}
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-6">
              <h3 className="text-sm font-semibold text-stone-800">🧾 Fatura Bilgileri</h3>

              <input type="hidden" name="invoice_type" value={invoiceType} />
              <div
                className="grid grid-cols-3 gap-1 rounded-xl border border-[#e8e0d4]/90 bg-[#f3efe6]/80 p-1 shadow-[inset_0_1px_2px_rgba(62,52,38,0.06)]"
                role="radiogroup"
                aria-label="Fatura tipi"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={invoiceType === "individual"}
                  onClick={() => setInvoiceType("individual")}
                  className={`flex items-center justify-center rounded-lg px-2 py-2.5 text-center text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b]/50 ${
                    invoiceType === "individual"
                      ? "bg-[linear-gradient(180deg,#faf4ea_0%,#f0e4d0_100%)] text-stone-900 shadow-[0_2px_8px_rgba(198,161,91,0.22)] ring-1 ring-[#c6a15b]/40"
                      : "text-stone-500 hover:bg-white/50 hover:text-stone-700"
                  }`}
                >
                  👤 Bireysel
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={invoiceType === "sole"}
                  onClick={() => setInvoiceType("sole")}
                  className={`flex items-center justify-center rounded-lg px-2 py-2.5 text-center text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b]/50 ${
                    invoiceType === "sole"
                      ? "bg-[linear-gradient(180deg,#faf4ea_0%,#f0e4d0_100%)] text-stone-900 shadow-[0_2px_8px_rgba(198,161,91,0.22)] ring-1 ring-[#c6a15b]/40"
                      : "text-stone-500 hover:bg-white/50 hover:text-stone-700"
                  }`}
                >
                  🧾 Şahıs Şirketi
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={invoiceType === "company"}
                  onClick={() => setInvoiceType("company")}
                  className={`flex items-center justify-center rounded-lg px-2 py-2.5 text-center text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a15b]/50 ${
                    invoiceType === "company"
                      ? "bg-[linear-gradient(180deg,#faf4ea_0%,#f0e4d0_100%)] text-stone-900 shadow-[0_2px_8px_rgba(198,161,91,0.22)] ring-1 ring-[#c6a15b]/40"
                      : "text-stone-500 hover:bg-white/50 hover:text-stone-700"
                  }`}
                >
                  🏢 Şirket
                </button>
              </div>

              {invoiceType === "company" ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Şirket Ünvanı</label>
                    <input
                      name="invoice_company_name"
                      placeholder="Şirket ünvanı"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Vergi No</label>
                    <input
                      name="invoice_tax_no"
                      inputMode="numeric"
                      value={taxNo}
                      onChange={(e) => setTaxNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      required
                      pattern="^[0-9]{10}$"
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                      onInvalid={(e) => e.currentTarget.setCustomValidity("Lütfen geçerli bir vergi numarası giriniz.")}
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                    />
                    <p className="mt-1.5 text-xs font-light text-stone-500">10 haneli vergi numarası</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Vergi Dairesi</label>
                    <input
                      name="invoice_tax_office"
                      placeholder="Vergi Dairesi"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                    />
                  </div>
                </div>
              ) : invoiceType === "sole" ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Ad Soyad</label>
                    <input
                      name="invoice_full_name"
                      defaultValue={resolvedAccountName || undefined}
                      placeholder="Ad Soyad"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">
                      T.C. Kimlik No{" "}
                      <span className="font-normal text-stone-500">(Vergi yerine T.C)</span>
                    </label>
                    <input
                      name="invoice_tc_identity_no"
                      inputMode="numeric"
                      value={tcIdentityNo}
                      onChange={(e) => setTcIdentityNo(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      required
                      pattern="^[0-9]{11}$"
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                      onInvalid={(e) => e.currentTarget.setCustomValidity("Lütfen geçerli bir T.C. kimlik numarası giriniz.")}
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                    />
                    <p className="mt-1.5 text-xs font-light text-stone-500">11 haneli kimlik numarası</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Vergi Dairesi</label>
                    <input
                      name="invoice_tax_office"
                      placeholder="Vergi Dairesi"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-600">Ad Soyad</label>
                    <input
                      name="invoice_full_name"
                      defaultValue={resolvedAccountName || undefined}
                      placeholder="Ad Soyad"
                      required
                      className="h-12 w-full rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                    />
                  </div>
                </div>
              )}

              {!invoiceSameAsDelivery ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <select
                    name="invoice_city"
                    value={invoiceCity}
                    onChange={(e) => {
                      setInvoiceCity(e.target.value);
                      setInvoiceDistrict("");
                    }}
                    className="col-span-2 h-12 rounded-xl border border-stone-200/90 bg-stone-50/90 px-3 text-sm text-stone-900 placeholder:text-sm outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35 md:col-span-1"
                  >
                    <option value="">İl seçiniz</option>
                    {TURKIYE_CITIES.map((cityOption) => (
                      <option key={`invoice-${cityOption}`} value={cityOption}>
                        {cityOption}
                      </option>
                    ))}
                  </select>
                  <select
                    name="invoice_district"
                    value={invoiceDistrict}
                    onChange={(e) => setInvoiceDistrict(e.target.value)}
                    disabled={!invoiceCity}
                    className="col-span-2 h-12 min-w-0 rounded-xl border border-stone-200/90 bg-stone-50/90 px-3 text-[13px] text-stone-900 placeholder:text-sm outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35 md:col-span-1"
                  >
                    <option value="">{invoiceCity ? "İlçe seçin" : "İlçe"}</option>
                    {getDistrictOptions(invoiceCity).map((districtOption) => (
                      <option key={`invoice-${districtOption}`} value={districtOption}>
                        {districtOption}
                      </option>
                    ))}
                  </select>
                  <input
                    name="invoice_postal_code"
                    placeholder="Posta Kodu"
                    className="col-span-2 h-12 rounded-xl border border-stone-200/90 bg-stone-50/90 px-2.5 text-sm text-stone-900 placeholder:text-xs outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35 md:col-span-1"
                  />
                  <p className="col-span-2 -mt-2 text-[11px] text-stone-500 md:col-span-1">
                    Bilmiyorsan{" "}
                    <a
                      href="https://postakodu.ptt.gov.tr/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#8b6a3f] underline decoration-[#c6a15b]/70 underline-offset-2 hover:text-[#6f5432]"
                    >
                      PTT posta kodu sorgu
                    </a>{" "}
                    sayfasını aç.
                  </p>
                  <textarea
                    name="invoice_address_line"
                    placeholder="Mahalle, sokak, bina no, daire vb."
                    rows={3}
                    maxLength={500}
                    className="min-h-[96px] sm:col-span-3 w-full resize-y rounded-xl border border-stone-200/90 bg-stone-50/90 px-4 py-2.5 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                  />
                </div>
              ) : null}

              <label className="flex cursor-pointer items-start gap-2.5 border-t border-[#ece7df]/90 pt-5 text-sm font-light text-stone-500">
                <input
                  type="checkbox"
                  name="invoice_same_as_delivery"
                  checked={invoiceSameAsDelivery}
                  onChange={(e) => setInvoiceSameAsDelivery(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300/90 text-[#b8945f]"
                />
                <span>Fatura adresi teslimat adresi ile aynı</span>
              </label>
            </section>
          </div>

          <div className="space-y-3">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-800">🎁 Zelula Puanlarını Kullan</h3>
              {isSignedIn ? (
                <div
                  className={`rounded-xl border px-3 py-3 transition ${
                    useLoyaltyRedeem
                      ? "border-[#d6c3a4] bg-[linear-gradient(180deg,#fdf7ed_0%,#f8efdf_100%)]"
                      : "border-[#e8dccb] bg-[#faf6ef]"
                  }`}
                >
                  <p className="text-sm text-stone-700">
                    Mevcut puanın: <span className="font-semibold text-stone-900">{loyaltyAvailablePoints} puan</span> (
                    <span className="font-semibold text-stone-900">{formatTry(loyaltyTryValue)} değerinde</span>)
                  </p>
                  <p className="mt-1 text-[11px] text-stone-500">Bu siparişte en fazla sepet tutarının %50&apos;si kadar puan kullanılabilir.</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e8dcc8]/80 bg-white px-3 py-2.5">
                    <input
                      type="checkbox"
                      name="loyalty_redeem"
                      value="on"
                      checked={hasLoyaltyPoints ? useLoyaltyRedeem : false}
                      disabled={!hasLoyaltyPoints || pending}
                      onChange={(e) => {
                        setUseLoyaltyRedeem(e.target.checked && hasLoyaltyPoints);
                        setAppliedPromo(null);
                        setPromoError(null);
                        setAppliedGift(null);
                        setGiftError(null);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-[#c9b8a4] text-[#b8945f] focus:ring-[#c6a15b]/35"
                    />
                    <span className="text-sm font-medium text-[#3d352c]">Puanlarımı kullan</span>
                  </label>
                  {useLoyaltyRedeem && hasLoyaltyPoints ? (
                    <p className="mt-2 text-xs font-medium text-[#7a5f38]">Puanların uygulandı 🎉</p>
                  ) : null}
                  {!hasLoyaltyPoints ? <p className="mt-2 text-xs text-stone-500">Henüz kullanabileceğin puan yok.</p> : null}
                </div>
              ) : (
                <div className="rounded-xl border border-[#e8dccb] bg-[#faf6ef] px-3 py-3">
                  <p className="text-[12px] font-light leading-relaxed text-[#5c5248]">
                    Zelula Puan avantajları için{" "}
                    <Link href={`/giris?next=${encodeURIComponent("/sepet")}`} className="font-medium underline-offset-2 hover:underline">
                      giriş yap
                    </Link>
                    .
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[#e8dccb]/90 bg-white/80 p-3.5">
              <h3 className="text-sm font-semibold text-stone-800">Hediye kartı kodu</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                Dijital hediye kartı kodunuzu girin; bakiye sipariş tutarından düşülür.
              </p>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  id="checkout-gift-card"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={giftDraft}
                  onChange={(e) => {
                    setGiftDraft(e.target.value);
                    setGiftError(null);
                  }}
                  placeholder="Hediye kartı kodu"
                  disabled={pending || giftPreviewing}
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                />
                <div className="flex gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={pending || giftPreviewing || !giftDraft.trim()}
                    onClick={() => {
                      setGiftError(null);
                      startGiftPreview(async () => {
                        const r = await previewGiftCard(giftDraft, orderTotalBeforeGift);
                        if (r.ok) {
                          setAppliedGift({
                            amountApplied: r.amountApplied,
                            last4: r.last4,
                            balanceRemaining: r.balanceRemaining,
                          });
                        } else {
                          setAppliedGift(null);
                          setGiftError(r.error);
                        }
                      });
                    }}
                    className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {giftPreviewing ? "…" : "Uygula"}
                  </button>
                  {appliedGift ? (
                    <button
                      type="button"
                      disabled={pending || giftPreviewing}
                      onClick={() => {
                        setAppliedGift(null);
                        setGiftError(null);
                      }}
                      className="shrink-0 rounded-xl border border-transparent px-3 py-2 text-sm text-stone-600 underline-offset-2 hover:underline"
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
              </div>
              {giftError ? (
                <p className="mt-2 text-xs font-light text-stone-800" role="alert">
                  {giftError}
                </p>
              ) : null}
              {appliedGift ? (
                <p className="mt-2 text-xs font-medium text-stone-700">
                  −{formatTry(appliedGift.amountApplied)} uygulandı
                  {appliedGift.last4 ? ` (····${appliedGift.last4})` : ""}. Kalan bakiye:{" "}
                  {formatTry(appliedGift.balanceRemaining)}.
                </p>
              ) : null}
              {appliedGift && giftDraft.trim() ? (
                <input type="hidden" name="gift_card_code" value={giftDraft.trim()} />
              ) : null}
            </section>

            <section className="space-y-2.5">
              <h3 className="text-sm font-semibold text-stone-800">🎁 İndirim kodun var mı?</h3>
            </section>

            <details className="mt-4 rounded-lg border border-dashed border-[#e8dccb] bg-white/70 p-3">
              <summary className="cursor-pointer text-xs font-medium text-stone-600">İndirim kodunu uygula</summary>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                Kodunu yazıp <span className="font-medium text-stone-700">Uygula</span>ya bas. Yukarıdaki Instagram kartında adımlar var.
              </p>
              <Link
                href={instagramProfileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center rounded-full border border-[#d9c19a] bg-[linear-gradient(135deg,#f5e8d3,#ecd6b5)] px-3 py-1.5 text-xs font-semibold text-stone-800 underline-offset-2 transition hover:text-stone-900 hover:brightness-[0.98]"
                onClick={() =>
                  trackInstagramClick({
                    location: "checkout_coupon_details",
                    href: instagramProfileHref,
                  })
                }
              >
                @{instagramUsername} — Instagram
              </Link>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  id="checkout-promo"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={promoDraft}
                  onChange={(e) => {
                    setPromoDraft(e.target.value);
                    setPromoError(null);
                  }}
                  placeholder={promoCampaignActive ? "Kodu girin" : "Varsa kodunuzu girin"}
                  disabled={pending || previewing}
                  className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#C6A15B] focus:ring-2 focus:ring-[#e8c98b]/35"
                />
                <div className="flex gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={pending || previewing || !promoDraft.trim()}
                    onClick={() => {
                      setPromoError(null);
                      startPreview(async () => {
                        const r = await previewPromoDiscount(subtotalAfterLoyalty, promoDraft);
                        if (r.ok) {
                          const nextCode = promoDraft.trim().toUpperCase();
                          trackCouponUsage({
                            code: nextCode,
                            discount_amount: r.discountAmount,
                            percent: r.percent,
                            subtotal_before_discount: subtotalAfterLoyalty,
                            subtotal_after_discount: Math.max(0, subtotalAfterLoyalty - r.discountAmount),
                          });
                          setAppliedPromo({
                            code: nextCode,
                            discountAmount: r.discountAmount,
                            percent: r.percent,
                          });
                          setAppliedGift(null);
                          setGiftError(null);
                        } else {
                          setAppliedPromo(null);
                          setPromoError(r.error);
                        }
                      });
                    }}
                    className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewing ? "…" : "Uygula"}
                  </button>
                  {appliedPromo ? (
                    <button
                      type="button"
                      disabled={pending || previewing}
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoError(null);
                      }}
                      className="shrink-0 rounded-xl border border-transparent px-3 py-2 text-sm text-stone-600 underline-offset-2 hover:underline"
                    >
                      Kaldır
                    </button>
                  ) : null}
                </div>
              </div>
            </details>
            {promoError ? (
              <p className="mt-2 text-xs font-light text-stone-800" role="alert">
                {promoError}
              </p>
            ) : null}
            {appliedPromo ? (
              <p className="mt-2 text-xs font-medium text-stone-700">
                {appliedPromo.percent}% indirim uygulandı (−{formatTry(appliedPromo.discountAmount)}).
              </p>
            ) : null}
            {appliedPromo ? <input type="hidden" name="promo_code" value={appliedPromo.code} /> : null}

            <section
              ref={legalSectionRef}
              className="rounded-xl border border-[#e7dfd4]/85 bg-[linear-gradient(180deg,#fdfbf8_0%,#f8f4ee_100%)] p-3.5 sm:p-4"
              aria-labelledby="checkout-compliance-heading"
            >
              <h2 id="checkout-compliance-heading" className="sr-only">
                Yasal onaylar
              </h2>
              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#e5ddd1]/90 bg-white/80 px-2.5 py-2 text-[13px] leading-snug text-stone-800">
                  <input
                    type="checkbox"
                    name="accept_distance_sales"
                    value="on"
                    checked={acceptDistanceSales}
                    onChange={(e) => {
                      setAcceptDistanceSales(e.currentTarget.checked);
                      setLegalAcceptWarning(null);
                    }}
                    className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-stone-900 focus:ring-amber-600/40"
                  />
                  <span>
                    Mesafeli satış sözleşmesi{" "}
                    <button
                      type="button"
                      className="font-medium text-[#7a5f38] underline decoration-[#c6a15b]/75 underline-offset-2 transition hover:text-[#5c482c]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModal("distance");
                      }}
                    >
                      (görüntüle)
                    </button>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#e5ddd1]/90 bg-white/80 px-2.5 py-2 text-[13px] leading-snug text-stone-800">
                  <input
                    type="checkbox"
                    name="accept_pre_contract_info"
                    value="on"
                    checked={acceptPreContractInfo}
                    onChange={(e) => {
                      setAcceptPreContractInfo(e.currentTarget.checked);
                      setLegalAcceptWarning(null);
                    }}
                    className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-stone-900 focus:ring-amber-600/40"
                  />
                  <span>
                    Ön bilgilendirme formu{" "}
                    <button
                      type="button"
                      className="font-medium text-[#7a5f38] underline decoration-[#c6a15b]/75 underline-offset-2 transition hover:text-[#5c482c]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModal("pre");
                      }}
                    >
                      (görüntüle)
                    </button>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#e5ddd1]/90 bg-white/80 px-2.5 py-2 text-[13px] leading-snug text-stone-800">
                  <input
                    type="checkbox"
                    name="kvkk_consent"
                    value="on"
                    checked={acceptKvkkConsent}
                    onChange={(e) => {
                      setAcceptKvkkConsent(e.currentTarget.checked);
                      setLegalAcceptWarning(null);
                    }}
                    className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-stone-900 focus:ring-amber-600/40"
                  />
                  <span>
                    Gizlilik politikası{" "}
                    <button
                      type="button"
                      className="font-medium text-[#7a5f38] underline decoration-[#c6a15b]/75 underline-offset-2 transition hover:text-[#5c482c]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalModal("privacy");
                      }}
                    >
                      (görüntüle)
                    </button>{" "}
                    için onay veriyorum.
                  </span>
                </label>
              </div>
              <p className="mt-2 px-1 text-[11px] leading-snug text-stone-500">
                Siparişi tamamlayarak gerekli sözleşmeleri kabul etmiş olursunuz.
              </p>
              {legalAcceptWarning ? (
                <p className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[12px] font-medium text-amber-950" role="alert">
                  {legalAcceptWarning}
                </p>
              ) : null}
            </section>

            {promoDiscount > 0 || giftDiscount > 0 || loyaltyDiscount > 0 ? (
              <div className="mt-4 rounded-xl border border-[#e8dfd3] bg-[#f4f1ec] px-3 py-2 text-sm font-light text-stone-800">
                <div className="space-y-1.5">
                  {loyaltyDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span>Puan indirimi</span>
                      <span className="font-medium">-{formatTry(loyaltyDiscount)}</span>
                    </div>
                  ) : null}
                  {promoDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span>Promo indirimi</span>
                      <span className="font-medium">-{formatTry(promoDiscount)}</span>
                    </div>
                  ) : null}
                  {giftDiscount > 0 ? (
                    <div className="flex justify-between">
                      <span>Hediye kartı</span>
                      <span className="font-medium">-{formatTry(giftDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-[#e6ddd2] pt-1.5">
                    <span>Ödenecek (indirim sonrası)</span>
                    <span className="font-semibold">{formatTry(payable)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-[#e8dfd3] bg-[#faf8f5] px-3 py-2 text-sm font-light text-stone-800" role="alert">
              {error}
            </p>
          ) : null}
          {CHECKOUT_CLIENT_HANDOFF_DEBUG &&
          checkoutHandoffUrlDebug &&
          process.env.NODE_ENV !== "production" ? (
            <div
              className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-950 break-all"
              role="status"
            >
              <p className="font-semibold text-amber-900">Checkout debug (NEXT_PUBLIC_CHECKOUT_DEBUG=1)</p>
              <p className="mt-1 font-mono leading-relaxed">{checkoutHandoffUrlDebug}</p>
            </div>
          ) : null}
          {successHint ? (
            <p className="rounded-lg border border-[#e8dfd3] bg-[#faf8f5] px-3 py-2 text-sm font-light text-stone-800">
              {successHint}
            </p>
          ) : null}
          {successFallback ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Siparişiniz alındı.</p>
              <p className="mt-1">
                Sipariş no: <span className="font-mono">{successFallback.orderNumber}</span>
              </p>
              <p className="mt-1 text-xs">E-posta: {successFallback.email}</p>
              <Link href={successFallback.href} className="mt-2 inline-flex text-xs font-semibold underline underline-offset-2">
                Başarı sayfasına git
              </Link>
            </div>
          ) : null}

        </div>

        <div className="payment-area relative z-10 hidden shrink-0 flex-col gap-3 border-t border-[#e5d5bd]/85 bg-[linear-gradient(165deg,#fffdf9_0%,#f7ecda_100%)] px-6 py-5 lg:flex lg:px-7">
          <p className="text-base font-semibold text-stone-900">⚡ 2 dakikada güvenli ödeme</p>
          <p className="text-4xl font-semibold tracking-tight text-stone-900 tabular-nums">{formatTry(payable)}</p>
          <p className="text-[12px] text-stone-700">Bu alışverişten +{earnedPointsPreview} Zelula Puan kazanacaksın ✨</p>
          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full rounded-full bg-[linear-gradient(135deg,#2f2a24,#1f1b17)] px-6 py-[1.2rem] text-base font-semibold text-white shadow-[0_12px_28px_rgba(40,34,28,0.4)] transition hover:shadow-[0_0_0_1px_rgba(232,201,139,0.35),0_16px_36px_rgba(40,34,28,0.45)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
          >
            {pending ? "İşleniyor, lütfen bekleyin..." : paymentMethod === "bank_transfer" ? "Siparişi oluştur" : "Güvenli ödemeye geç"}
          </button>
          {!legalAllAccepted ? (
            <p className="text-center text-[11px] text-stone-500">
              Siparişi tamamlamak için sözleşmeleri onaylamalısınız.
            </p>
          ) : null}
          <p className="text-center text-[11px] leading-relaxed text-stone-600">Ödeme adımında kart bilgilerini girersin</p>
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-3 z-30 mx-auto w-[calc(100%-1rem)] max-w-md rounded-2xl border border-[#ebe6df]/90 bg-[#fffdfb]/95 p-3 shadow-[0_12px_28px_rgba(62,52,38,0.12)] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">{lineCount} ürün</p>
            <p className="font-semibold text-stone-900">{formatTry(payable)}</p>
            {promoDiscount > 0 || giftDiscount > 0 || loyaltyDiscount > 0 ? (
              <p className="text-[10px] font-light text-stone-600">İndirim dahil</p>
            ) : null}
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={submitDisabled}
            className="rounded-full bg-[linear-gradient(135deg,#C6A15B,#E8C98B)] px-5 py-2.5 text-sm font-semibold text-[#2f271f] shadow-[0_8px_18px_rgba(198,161,91,0.28)] transition hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
          >
            {pending ? "İşleniyor…" : paymentMethod === "bank_transfer" ? "Siparişi oluştur" : "Güvenli ödemeye geç"}
          </button>
        </div>
        {!legalAllAccepted ? (
          <p className="mt-2 text-center text-[11px] text-stone-500">
            Siparişi tamamlamak için sözleşmeleri onaylamalısınız.
          </p>
        ) : null}
      </div>

      {legalModalConfig ? (
        <CheckoutLegalModal
          open
          title={legalModalConfig.title}
          text={legalModalConfig.text}
          onClose={() => setLegalModal(null)}
        />
      ) : null}
    </>
  );
}
