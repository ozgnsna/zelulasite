"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCartItems, setCartItems } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { initializePayment } from "@/lib/payments/provider";
import { logPayment } from "@/lib/payments/logger";

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
});

export async function createCheckout(formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Form bilgileri eksik." };
  }

  const supabase = await createClient();
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
      return {
        product_id: p.id,
        quantity: line.quantity,
        unit_price: p.price,
        total_price: Number(p.price) * line.quantity,
      };
    })
    .filter(Boolean);

  const shipping = 0;
  const total = subtotal + shipping;
  const orderNumber = `ZL-${Date.now().toString().slice(-8)}`;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_name: parsed.data.customer_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subtotal,
      total,
      currency: "TRY",
      payment_status: "pending",
      order_status: "pending",
      payment_provider: process.env.PAYMENT_PROVIDER ?? "paytr",
      shipping_address_json: {
        address_line: parsed.data.address_line,
        city: parsed.data.city,
        district: parsed.data.district,
        postal_code: parsed.data.postal_code,
      },
    })
    .select("*")
    .single();

  if (error || !order) {
    logPayment("error", "Order creation failed before payment init.", { error });
    return { ok: false, error: "Siparişiniz oluşturulamadı. Lütfen birkaç saniye sonra tekrar deneyin." };
  }

  await supabase.from("order_items").insert(orderItems.map((i) => ({ ...i!, order_id: order.id })));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
  });

  await supabase.from("payment_logs").insert({
    order_id: order.id,
    provider: process.env.PAYMENT_PROVIDER ?? "paytr",
    event_type: "init",
    status: payment.ok ? "initialized" : "failed",
    request_payload: parsed.data,
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
    });
    return { ok: false, error: "Ödeme adımı başlatılamadı. Lütfen tekrar deneyin veya destekle iletişime geçin." };
  }
  await setCartItems([]);
  return { ok: true, url: payment.redirectUrl };
}
