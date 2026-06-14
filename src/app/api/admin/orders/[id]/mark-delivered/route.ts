import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { markOrderHandDeliveredInDb } from "@/lib/admin/mark-order-hand-delivered";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isAdminSession(email: string | undefined): boolean {
  if (!email?.trim()) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(email.toLowerCase());
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Sipariş kimliği gerekli." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminSession(user.email)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await markOrderHandDeliveredInDb(admin, orderId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  return NextResponse.json({
    ok: true,
    alreadyDelivered: result.alreadyDelivered ?? false,
  });
}
