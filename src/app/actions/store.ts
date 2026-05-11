"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getCartItems, setCartItems } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializePayment } from "@/lib/payments/provider";
import { getQnbFlowDebugMeta, getQnbPaymentConfig } from "@/lib/payments/qnb-finansbank";
import { isCheckoutHandoffDebugEnabled, isPaymentFlowDebugEnabled, logPayment } from "@/lib/payments/logger";
import { computeInstagramFollowerDiscount } from "@/lib/promo-instagram";
import { getUserLoyaltyBalance } from "@/lib/loyalty/balance";
import { pickCheckoutReferrer, ZELULA_REFERRAL_COOKIE } from "@/lib/referral/server";
import { LEGAL_CONTRACT_VERSION } from "@/lib/legal/legal-content";
import { buildLegalSnapshot } from "@/lib/legal/legal-snapshot";
import { notifyAdminOrderEventWithResult } from "@/lib/notifications/order-admin";

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

function resolveSiteUrl(h: Headers): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const proto = h.get("x-forwarded-proto")?.trim() || "https";
  const host = h.get("x-forwarded-host")?.trim() || h.get("host")?.trim() || "";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`.replace(/\/+$/, "");
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

export async function clearCart() {
  await setCartItems([]);
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
  const admin = createAdminClient();
  const { data: productRows, error: productsError } = await admin
    .from("products")
    .select("id,name,price,is_active,stock_quantity")
    .in("id", ids);
  if (productsError || !productRows) {
    return { ok: false, error: "Ürün bilgileri alınamadı. Sayfayı yenileyip tekrar deneyin." };
  }
  const productById = new Map(productRows.map((r) => [r.id, r]));

  for (const line of cart) {
    const p = productById.get(line.productId);
    if (!p) {
      return {
        ok: false,
        error: "Sepetinizde artık bulunmayan ürünler var. Sepeti güncelleyip tekrar deneyin.",
      };
    }
    if (!p.is_active) {
      return {
        ok: false,
        error: "Sepetinizde satışa kapalı ürünler var. Sepet sayfasından kaldırıp tekrar deneyin.",
      };
    }
    if (Number(p.stock_quantity ?? 0) < line.quantity) {
      return {
        ok: false,
        error: "Bir veya daha fazla ürün için stok yetersiz. Miktarları güncelleyip tekrar deneyin.",
      };
    }
  }

  let subtotal = 0;
  const orderItems = cart.map((line) => {
    const p = productById.get(line.productId)!;
    subtotal += Number(p.price) * line.quantity;
    const unit = Number(Number(p.price).toFixed(2));
    const lineTotal = Number((Number(p.price) * line.quantity).toFixed(2));
    return {
      product_id: p.id,
      quantity: line.quantity,
      unit_price: unit,
      total_price: lineTotal,
    };
  });
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
  const legalIp = legalIpFromHeaders(requestHeaders);
  const legalUserAgent = safeLegalUserAgent(requestHeaders);
  const paymentMethod = parsed.data.payment_method;
  const isBankTransfer = paymentMethod === "bank_transfer";
  const isMissingColumnError = (message: string) => {
    const msgLower = message.toLowerCase();
    return (
      (/column/i.test(message) && /does not exist|undefined column/i.test(message)) ||
      /could not find.*column/i.test(msgLower) ||
      /schema cache/i.test(msgLower)
    );
  };
  const baseOrderInsert = {
    user_id: user?.id ?? null,
    order_number: orderNumber,
    customer_name: parsed.data.customer_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    subtotal: Number(subtotal.toFixed(2)),
    discount_amount: Number(discountAmount.toFixed(2)),
    discount_label: discountLabel,
    total: Number(total.toFixed(2)),
    currency: "TRY",
    payment_status: "pending",
    order_status: "pending",
    payment_provider: isBankTransfer ? "bank_transfer" : "qnb_finansbank",
    shipping_address_json: {
      address_line: parsed.data.address_line,
      city: parsed.data.city,
      district: parsed.data.district,
      postal_code: parsed.data.postal_code,
      delivery_note: parsed.data.delivery_note || null,
    },
  };
  const extendedOrderInsert = {
    ...baseOrderInsert,
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
  };
  const slimOrderInsert = {
    user_id: user?.id ?? null,
    order_number: orderNumber,
    customer_name: parsed.data.customer_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    total: Number(total.toFixed(2)),
    payment_status: "pending",
    order_status: "pending",
    payment_provider: isBankTransfer ? "bank_transfer" : "qnb_finansbank",
  };

  let { data: order, error } = await admin
    .from("orders")
    .insert(extendedOrderInsert)
    .select("*")
    .single();

  if (error) {
    if (isMissingColumnError(error.message ?? "")) {
      const retry = await admin.from("orders").insert(baseOrderInsert).select("*").single();
      order = retry.data ?? null;
      error = retry.error;
      if (error && isMissingColumnError(error.message ?? "")) {
        const retrySlim = await admin.from("orders").insert(slimOrderInsert).select("*").single();
        order = retrySlim.data ?? null;
        error = retrySlim.error;
      }
    }
  }

  // TODO(emails): Sipariş onayı e-postası eklendiğinde `legal_contract_snapshot` PDF ekine dönüştürülebilir.

  if (error || !order) {
    const msg = error?.message ?? "";
    const code = error?.code ?? "";
    logPayment("error", "Order creation failed before payment init.", {
      code,
      message: msg,
      details: error?.details,
      hint: error?.hint,
    });
    const msgLower = msg.toLowerCase();
    const isMissingColumn = isMissingColumnError(msg);
    const isUniqueViolation = code === "23505" || /duplicate key|unique constraint/i.test(msg);
    const isRlsOrPrivilege =
      code === "42501" ||
      /row-level security|violates row-level security|permission denied/i.test(msgLower);
    const isForeignKey =
      code === "23503" || /foreign key constraint|violates foreign key/i.test(msgLower);
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
    if (isRlsOrPrivilege) {
      return {
        ok: false,
        error:
          "Sipariş kaydı sunucu izniyle oluşturulamadı. Barındırma ortamında SUPABASE_SERVICE_ROLE_KEY değerinin doğru (anon key değil, service_role) tanımlandığını kontrol edin.",
      };
    }
    if (isForeignKey) {
      return {
        ok: false,
        error: "Sipariş ilişkili kayıtlarla eşleşmedi. Oturumu kapatıp tekrar deneyin veya destekle iletişime geçin.",
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
  const siteUrl = resolveSiteUrl(requestHeaders);

  if (isBankTransfer) {
    const notifyResult = await notifyAdminOrderEventWithResult({
      event: "order_created_bank_transfer",
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.email,
      customerPhone: order.phone,
      total: Number(order.total ?? 0),
      currency: String(order.currency ?? "TRY"),
      paymentStatus: String(order.payment_status ?? "pending"),
      paymentProvider: String(order.payment_provider ?? "bank_transfer"),
      items: cart.map((line) => {
        const p = productById.get(line.productId);
        return {
          name: String(p?.name ?? "Urun"),
          quantity: line.quantity,
          totalPrice: Number((Number(p?.price ?? 0) * line.quantity).toFixed(2)),
        };
      }),
      adminOrderUrl: `${siteUrl}/admin/orders/${order.id}`,
    });

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
    await admin.from("payment_logs").insert({
      order_id: order.id,
      provider: "internal_notify",
      event_type: "admin_notify",
      status: notifyResult.email.ok || notifyResult.whatsapp.ok ? "sent_partial_or_full" : "failed",
      response_payload: notifyResult,
      callback_payload: null,
      callback_hash: null,
      reference: order.order_number,
      verification_status:
        notifyResult.email.ok || notifyResult.whatsapp.ok ? "passed" : "failed",
      verification_error:
        notifyResult.email.error || notifyResult.whatsapp.error || null,
      processed_at: new Date().toISOString(),
    });
    // Bank transfer siparişi kaydedildikten sonra sepet temizlenir.
    await setCartItems([]);
    revalidatePath("/sepet");
    const bankSuccessPath = `/siparis/${order.id}/basarili?pm=bank_transfer`;
    return {
      ok: true,
      url: `${siteUrl}${bankSuccessPath}`,
      fallbackUrl: bankSuccessPath,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentMethod: "bank_transfer" as const,
    };
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

  const cardOkUrl = `${siteUrl}/api/payments/qnb-return`;
  const cardFailUrl = cardOkUrl;

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
    successUrl: cardOkUrl,
    failUrl: cardFailUrl,
    callbackUrl: `${siteUrl}/api/payments/qnb-return`,
    clientIp,
    shippingAddressLine,
  });

  const checkoutLogPayload = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => key !== "promo_code"),
  );

  await admin.from("payment_logs").insert({
    order_id: order.id,
    provider: "qnb_finansbank",
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

  const redirectTrimmed = payment.redirectUrl.trim();
  const cardHandoffOk =
    redirectTrimmed.includes("/odeme/qnb-baslat/") || redirectTrimmed.includes("/odeme/qnb-mock");
  if (!cardHandoffOk) {
    logPayment("error", "Checkout: kart için redirectUrl beklenen rota değil (bypass / yanlış yapılandırma).", {
      orderId: order.id,
      orderNumber: order.order_number,
      redirectUrl: redirectTrimmed,
      initRaw: payment.raw,
      ...getQnbFlowDebugMeta(),
      ...getQnbPaymentConfig(),
    });
    return {
      ok: false,
      error:
        "Ödeme yönlendirmesi beklenmeyen bir adrese işaret ediyor. Barındırma ortamındaki ödeme yapılandırmasını kontrol edin veya destek ile iletişime geçin.",
    };
  }

  if (isCheckoutHandoffDebugEnabled()) {
    logPayment("info", "Checkout handoff (kart, sunucu).", {
      paymentMethod: parsed.data.payment_method,
      paymentProvider: "qnb_finansbank",
      orderId: order.id,
      orderNumber: order.order_number,
      redirectUrl: redirectTrimmed,
      initRaw: payment.raw,
      ...getQnbFlowDebugMeta(),
    });
  }
  if (isPaymentFlowDebugEnabled()) {
    logPayment("info", "Checkout → ödeme yönlendirmesi.", {
      paymentProvider: "qnb_finansbank",
      orderId: order.id,
      orderNumber: order.order_number,
      ...getQnbFlowDebugMeta(),
      redirectUrl: redirectTrimmed,
      initRaw: payment.raw,
    });
  }
  return {
    ok: true,
    url: redirectTrimmed,
    orderId: order.id,
    orderNumber: order.order_number,
    fallbackUrl: `/odeme/qnb-baslat/${order.id}`,
    paymentMethod: "card" as const,
    ...(isPaymentFlowDebugEnabled()
      ? { payFlowDebugSnapshot: { ...getQnbFlowDebugMeta(), redirectUrl: redirectTrimmed } }
      : {}),
  };
}
