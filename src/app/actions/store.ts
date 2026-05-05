"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getCartItems, setCartItems } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializePayment } from "@/lib/payments/provider";
import { logPayment } from "@/lib/payments/logger";
import { computeInstagramFollowerDiscount } from "@/lib/promo-instagram";
import { getUserLoyaltyBalance } from "@/lib/loyalty/balance";
import { pickCheckoutReferrer, ZELULA_REFERRAL_COOKIE } from "@/lib/referral/server";
import { LEGAL_CONTRACT_VERSION } from "@/lib/legal/legal-content";
import { buildLegalSnapshot } from "@/lib/legal/legal-snapshot";

/** ZLL0001… atomik sıra; migration / RPC yoksa eski uzun format. */
async function allocateOrderNumber(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data, error } = await admin.rpc("next_order_public_number");
  if (!error && data != null) {
    const s = typeof data === "string" ? data : String(data);
    if (/^ZLL\d+$/.test(s.trim())) return s.trim();
  }
  return `ZL-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 39);
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 39);
  return "127.0.0.1";
}

/** Yasal kayıt için: XFF ilk IP, yoksa X-Real-IP, yoksa null. */
function legalIpFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return null;
}

function safeLegalUserAgent(h: Headers): string | null {
  const raw = h.get("user-agent")?.trim();
  if (!raw) return null;
  const cut = raw.slice(0, 255);
  return cut.length > 0 ? cut : null;
}

const LEGAL_CHECKOUT_ACK_ERROR =
  "Devam etmek için mesafeli satış sözleşmesi, ön bilgilendirme formu ve gizlilik politikasını onaylamalısınız.";

export async function addToCart(productId: string) {
  const cart = await getCartItems();
  const existing = cart.find((i) => i.productId === productId);
  if (existing) existing.quantity += 1;
  else cart.push({ productId, quantity: 1 });
  await setCartItems(cart);
  revalidatePath("/sepet");
  revalidatePath("/");
}

export async function updateCartItem(productId: string, quantity: number) {
  const cart = await getCartItems();
  const next = cart
    .map((i) => (i.productId === productId ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  await setCartItems(next);
  revalidatePath("/sepet");
}

const checkoutSchema = z.object({
  customer_name: z.string().min(2, "Lütfen ad soyad bilgisi girin."),
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  phone: z.string().min(10, "Telefon numarası en az 10 haneli olmalı."),
  address_line: z.string().min(5, "Lütfen açık adresinizi yazın."),
  city: z.string().min(2, "İl bilgisi gerekli."),
  district: z.string().min(2, "İlçe bilgisi gerekli."),
  postal_code: z.string().min(4, "Posta kodu en az 4 karakter olmalı."),
  delivery_note: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, 300) : ""),
    z.string().max(300),
  ),
  promo_code: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().slice(0, 64) : ""),
    z.string().max(64),
  ),
  payment_method: z.enum(["card", "bank_transfer"]).default("card"),
});

export async function previewPromoDiscount(subtotal: number, rawCode: string) {
  return computeInstagramFollowerDiscount(subtotal, rawCode);
}

export async function createCheckout(formData: FormData) {
  const entries = Object.fromEntries(formData.entries());
  const ackDistance = entries.accept_distance_sales === "on";
  const ackPre = entries.accept_pre_contract_info === "on";
  const ackKvkk = entries.kvkk_consent === "on";
  if (!ackDistance || !ackPre || !ackKvkk) {
    return { ok: false, error: LEGAL_CHECKOUT_ACK_ERROR };
  }

  const parsed = checkoutSchema.safeParse(entries);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Form bilgileri eksik." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cart = await getCartItems();
  if (cart.length === 0) return { ok: false, error: "Sepetiniz boş. Lütfen ürün ekleyin." };
  const ids = cart.map((x) => x.productId);
  const { data: products } = await supabase.from("products").select("*").in("id", ids);
  if (!products) return { ok: false, error: "Ürün bilgileri alınamadı. Sayfayı yenileyip tekrar deneyin." };

  let subtotal = 0;
  const orderItems = cart
    .map((line) => {
      const p = products.find((x) => x.id === line.productId);
      if (!p) return null;
      subtotal += Number(p.price) * line.quantity;
      const unit = Number(Number(p.price).toFixed(2));
      const lineTotal = Number((Number(p.price) * line.quantity).toFixed(2));
      return {
        product_id: p.id,
        quantity: line.quantity,
        unit_price: unit,
        total_price: lineTotal,
      };
    })
    .filter(Boolean);

  const admin = createAdminClient();
  const cookieStore = await cookies();
  const referralCode = cookieStore.get(ZELULA_REFERRAL_COOKIE)?.value ?? null;

  const shipping = 0;
  const useLoyaltyRedeem = String(formData.get("loyalty_redeem") ?? "") === "on";
  let loyaltyRedeemPoints = 0;
  let loyaltyDiscount = 0;
  if (useLoyaltyRedeem) {
    if (!user?.id) {
      return { ok: false, error: "Zelula Puan kullanmak için giriş yapmalısın." };
    }
    const balance = await getUserLoyaltyBalance(admin, user.id);
    if (balance <= 0) {
      return { ok: false, error: "Kullanılabilir Zelula Puanın yetersiz." };
    }
    const loyaltyDiscountByPoints = balance * 0.5;
    const loyaltyDiscountByCartRule = subtotal * 0.5;
    loyaltyDiscount = Math.max(0, Math.min(subtotal, loyaltyDiscountByPoints, loyaltyDiscountByCartRule));
    if (loyaltyDiscount <= 0) {
      return { ok: false, error: "Bu sepet için Zelula Puan indirimi uygulanamıyor." };
    }
    loyaltyRedeemPoints = Math.min(balance, Math.ceil(loyaltyDiscount * 2));
  }

  const promoRaw = parsed.data.promo_code;
  let promoDiscount = 0;
  let promoLabel: string | null = null;
  const promoBaseSubtotal = Math.max(0, subtotal - loyaltyDiscount);
  if (promoRaw) {
    const d = computeInstagramFollowerDiscount(promoBaseSubtotal, promoRaw);
    if (!d.ok) {
      return { ok: false, error: d.error };
    }
    promoDiscount = d.discountAmount;
    promoLabel = d.label;
  }

  const discountAmount = promoDiscount + loyaltyDiscount;
  const discountLabel = [promoLabel, loyaltyDiscount > 0 ? "Zelula Puan" : null].filter(Boolean).join(" · ") || null;
  const total = Math.max(0, subtotal + shipping - discountAmount);
  const orderNumber = await allocateOrderNumber(admin);
  const referralAttribution = await pickCheckoutReferrer({
    admin,
    buyerUserId: user?.id ?? null,
    referralCode,
  });

  const requestHeaders = await headers();
  const legalAcceptedAt = new Date().toISOString();
  const legalSnapshot = buildLegalSnapshot(legalAcceptedAt);
  const legalContractHash = createHash("sha256").update(JSON.stringify(legalSnapshot)).digest("hex");
  console.log("LEGAL_SNAPSHOT:", { snapshot: legalSnapshot, hash: legalContractHash });
  const legalIp = legalIpFromHeaders(requestHeaders);
  const legalUserAgent = safeLegalUserAgent(requestHeaders);
  const paymentMethod = parsed.data.payment_method;
  const isBankTransfer = paymentMethod === "bank_transfer";

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      order_number: orderNumber,
      customer_name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      discount_label: discountLabel,
      total: Number(total.toFixed(2)),
      loyalty_redeem_points: loyaltyRedeemPoints,
      referrer_user_id: referralAttribution.referrerUserId,
      referral_code: referralAttribution.referralCode,
      accept_distance_sales: true,
      accept_pre_contract_info: true,
      kvkk_consent: true,
      kvkk_consent_at: legalAcceptedAt,
      legal_accepted_at: legalAcceptedAt,
      legal_contract_version: LEGAL_CONTRACT_VERSION,
      legal_contract_snapshot: legalSnapshot,
      legal_contract_hash: legalContractHash,
      legal_ip: legalIp,
      legal_user_agent: legalUserAgent,
      currency: "TRY",
      payment_status: "pending",
      order_status: "pending",
      payment_provider: isBankTransfer ? "bank_transfer" : (process.env.PAYMENT_PROVIDER ?? "paytr"),
      shipping_address_json: {
        address_line: parsed.data.address_line,
        city: parsed.data.city,
        district: parsed.data.district,
        postal_code: parsed.data.postal_code,
        delivery_note: parsed.data.delivery_note || null,
      },
    })
    .select("*")
    .single();

  // TODO(emails): Sipariş onayı e-postası eklendiğinde `legal_contract_snapshot` PDF ekine dönüştürülebilir.

  if (error || !order) {
    const msg = error?.message ?? "";
    logPayment("error", "Order creation failed before payment init.", {
      code: error?.code,
      message: msg,
      details: error?.details,
      hint: error?.hint,
    });
    const isMissingColumn = /column/i.test(msg) && /does not exist/i.test(msg);
    const isUniqueViolation = error?.code === "23505" || /duplicate key|unique constraint/i.test(msg);
    if (process.env.NODE_ENV === "development" && msg) {
      return { ok: false, error: `Sipariş oluşturulamadı (geliştirme): ${msg}` };
    }
    if (isMissingColumn) {
      return {
        ok: false,
        error:
          "Veritabanı şeması güncel değil (sipariş sütunları eksik). Supabase’de migration’ların uygulandığından emin olun veya destek ile iletişime geçin.",
      };
    }
    if (isUniqueViolation) {
      return { ok: false, error: "Geçici bir çakışma oluştu. Lütfen tekrar deneyin." };
    }
    return { ok: false, error: "Siparişiniz oluşturulamadı. Lütfen birkaç saniye sonra tekrar deneyin." };
  }

  const saveAddressToProfile = String(formData.get("save_address") ?? "") === "on";
  if (user?.id && saveAddressToProfile) {
    const { count } = await supabase
      .from("customer_saved_addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const isFirstAddr = (count ?? 0) === 0;
    await supabase.from("customer_saved_addresses").insert({
      user_id: user.id,
      label: "Kayıtlı adres",
      recipient_name: parsed.data.customer_name,
      phone: parsed.data.phone,
      address_line: parsed.data.address_line,
      city: parsed.data.city,
      district: parsed.data.district,
      postal_code: parsed.data.postal_code,
      is_default: isFirstAddr,
    });
  }

  await admin.from("order_items").insert(orderItems.map((i) => ({ ...i!, order_id: order.id })));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (isBankTransfer) {
    await admin.from("payment_logs").insert({
      order_id: order.id,
      provider: "bank_transfer",
      event_type: "init",
      status: "awaiting_transfer",
      request_payload: {
        ...Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key !== "promo_code")),
        payment_method: "bank_transfer",
      },
      response_payload: { note: "manual_bank_transfer_flow" },
      callback_payload: null,
      callback_hash: null,
      reference: order.order_number,
      verification_status: "pending",
      verification_error: null,
      processed_at: new Date().toISOString(),
    });
    await setCartItems([]);
    return { ok: true, url: `${siteUrl}/odeme/basarili?oid=${order.id}&pm=bank_transfer` };
  }

  const clientIp = clientIpFromHeaders(requestHeaders);
  const shippingAddressLine = [
    parsed.data.address_line,
    [parsed.data.district, parsed.data.city].filter(Boolean).join(" / "),
    parsed.data.postal_code,
  ]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 400);

  const payment = await initializePayment({
    orderId: order.id,
    orderNumber: order.order_number,
    amount: total,
    currency: "TRY",
    customer: {
      name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    },
    successUrl: `${siteUrl}/odeme/basarili?oid=${order.id}`,
    failUrl: `${siteUrl}/odeme/basarisiz?oid=${order.id}&msg=generic`,
    callbackUrl: `${siteUrl}/api/payments/callback`,
    clientIp,
    shippingAddressLine,
  });

  const checkoutLogPayload = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => key !== "promo_code"),
  );

  await admin.from("payment_logs").insert({
    order_id: order.id,
    provider: process.env.PAYMENT_PROVIDER ?? "paytr",
    event_type: "init",
    status: payment.ok ? "initialized" : "failed",
    request_payload: checkoutLogPayload,
    response_payload: payment,
    callback_payload: null,
    callback_hash: null,
    reference: payment.reference ?? null,
    verification_status: payment.ok ? "passed" : "failed",
    verification_error: payment.ok ? null : payment.error ?? null,
    processed_at: new Date().toISOString(),
  });

  if (!payment.ok || !payment.redirectUrl) {
    logPayment("warn", "Payment initialization returned failure.", {
      orderId: order.id,
      error: payment.error,
      errorCode: payment.errorCode,
      raw: payment.raw,
    });
    const payErr = (payment.error ?? "").trim();
    if (payment.errorCode === "CONFIG_MISSING" && payErr) {
      return { ok: false, error: payErr };
    }
    if (process.env.NODE_ENV === "development" && payErr) {
      return { ok: false, error: `Ödeme başlatılamadı (geliştirme): ${payErr}` };
    }
    if (payErr && payErr.length < 220 && !/[<>]/.test(payErr)) {
      return { ok: false, error: `Ödeme adımı başlatılamadı: ${payErr}` };
    }
    return { ok: false, error: "Ödeme adımı başlatılamadı. Lütfen tekrar deneyin veya destekle iletişime geçin." };
  }
  await setCartItems([]);
  return { ok: true, url: payment.redirectUrl };
}
