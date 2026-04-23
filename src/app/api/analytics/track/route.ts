import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  event_name: z.string().min(1),
  occurred_at: z.string().datetime().optional(),
  page_path: z.string().optional(),
  client_id: z.string().optional(),
  ecommerce: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return new Response("invalid payload", { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("analytics_events").insert({
    event_name: parsed.data.event_name,
    occurred_at: parsed.data.occurred_at ?? new Date().toISOString(),
    page_path: parsed.data.page_path ?? null,
    client_id: parsed.data.client_id ?? null,
    ecommerce: parsed.data.ecommerce ?? null,
    meta: parsed.data.meta ?? null,
  });

  if (error) return new Response("db error", { status: 500 });
  return new Response("ok", { status: 200 });
}
