"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return;
  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function saveProduct(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    short_description: String(formData.get("short_description") ?? ""),
    full_description: String(formData.get("full_description") ?? ""),
    price: Number(formData.get("price") ?? 0),
    compare_at_price: Number(formData.get("compare_at_price") ?? 0) || null,
    sku: String(formData.get("sku") ?? ""),
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    featured: formData.get("featured") === "on",
    new_arrival: formData.get("new_arrival") === "on",
    category_id: String(formData.get("category_id") ?? ""),
    collection_id: String(formData.get("collection_id") ?? "") || null,
    material: String(formData.get("material") ?? "") || null,
    color: String(formData.get("color") ?? "") || null,
    is_active: formData.get("is_active") !== "off",
  };

  if (id) await supabase.from("products").update(payload).eq("id", id);
  else await supabase.from("products").insert(payload);
  revalidatePath("/admin");
}

export async function saveCategory(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  };
  if (id) await supabase.from("categories").update(payload).eq("id", id);
  else await supabase.from("categories").insert(payload);
  revalidatePath("/admin");
}

export async function saveCollection(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
  if (id) await supabase.from("collections").update(payload).eq("id", id);
  else await supabase.from("collections").insert(payload);
  revalidatePath("/admin");
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const order_status = String(formData.get("order_status") ?? "pending");
  const payment_status = String(formData.get("payment_status") ?? "pending");
  await supabase
    .from("orders")
    .update({ order_status, payment_status, updated_at: new Date().toISOString() })
    .eq("id", id);
  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: "manual",
    event_type: "manual_status_update",
    status: "updated",
    request_payload: { order_status, payment_status },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });
  revalidatePath("/admin");
}

export async function uploadProductImage(formData: FormData) {
  const supabase = createAdminClient();
  const productId = String(formData.get("product_id") ?? "");
  const file = formData.get("image") as File | null;
  if (!productId || !file) return;

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `products/${productId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return;

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  await supabase.from("product_images").insert({
    product_id: productId,
    image_url: data.publicUrl,
    is_cover: true,
    sort_order: 0,
  });
  revalidatePath("/admin");
  revalidatePath("/urunler");
}

export async function retryPaymentInit(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: order } = await supabase
    .from("orders")
    .select("id,payment_status,order_status,payment_provider")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.payment_status === "paid") return;

  await supabase
    .from("orders")
    .update({ payment_status: "pending", order_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: order.payment_provider ?? "paytr",
    event_type: "manual_retry_init",
    status: "queued",
    request_payload: { action: "retry_payment_init" },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidatePath("/admin");
}

export async function reconcileOrderStatus(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [{ data: order }, { data: logs }] = await Promise.all([
    supabase.from("orders").select("id,payment_status,payment_provider").eq("id", id).maybeSingle(),
    supabase
      .from("payment_logs")
      .select("status,callback_hash,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!order) return;

  const hasSuccess = (logs ?? []).some((l) => l.status === "success");
  const nextPaymentStatus = hasSuccess ? "paid" : order.payment_status;
  const nextOrderStatus = hasSuccess ? "confirmed" : "pending";

  if (!(order.payment_status === "paid" && !hasSuccess)) {
    await supabase
      .from("orders")
      .update({
        payment_status: nextPaymentStatus,
        order_status: nextOrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: order.payment_provider ?? "paytr",
    event_type: "manual_reconcile",
    status: hasSuccess ? "resolved_paid" : "checked_no_success",
    response_payload: { checked_logs: logs?.length ?? 0, hasSuccess },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidatePath("/admin");
}

export async function markOrderPaidManually(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id || confirm !== "ONAYLIYORUM") return;

  const { data: order } = await supabase
    .from("orders")
    .select("id,payment_status,payment_provider,order_number")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.payment_status === "paid") return;

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      order_status: "confirmed",
      payment_reference: order.order_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await supabase.from("payment_logs").insert({
    order_id: id,
    provider: "manual",
    event_type: "manual_mark_paid",
    status: "paid_override",
    request_payload: { confirm },
    verification_status: "passed",
    processed_at: new Date().toISOString(),
  });

  revalidatePath("/admin");
}
