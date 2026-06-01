import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCategory, saveCollection } from "@/app/actions/admin";
import { TaxonomyImageUploader } from "@/components/admin/TaxonomyImageUploader";
import { ADMIN_OPERATIONS_MAIN } from "@/lib/admin/admin-shell-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ taxonomyImageOk?: string; taxonomyImageError?: string }>;
}) {
  const sp = await searchParams;
  const taxonomyImageOk = sp.taxonomyImageOk === "1";
  const taxonomyImageError = sp.taxonomyImageError ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const [categoriesRes, collectionsRes] = await Promise.all([
    admin.from("categories").select("id,name,slug,image_url").order("name", { ascending: true }).limit(100),
    admin.from("collections").select("id,name,slug,description,image_url").order("name", { ascending: true }).limit(100),
  ]);

  const categories = categoriesRes.data ?? [];
  const collections = collectionsRes.data ?? [];

  return (
    <main className={`${ADMIN_OPERATIONS_MAIN} py-8 sm:py-10 lg:py-10`}>
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Yapılandırma</p>
          <h1 className="mt-1 font-serif text-2xl font-light tracking-tight text-stone-900 sm:text-3xl">Site ayarları</h1>
          <p className="mt-1 text-sm text-stone-600">Ana sayfa kartları ve vitrin görselleri.</p>
        </div>

        {taxonomyImageOk ? (
          <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
            Görsel yüklendi ve kaydedildi.
          </div>
        ) : null}
        {taxonomyImageError ? (
          <div className="mb-4 rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-950">
            <span className="font-medium">Görsel yüklenemedi:</span> {taxonomyImageError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200/70 bg-white/95 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Kategori görselleri</h2>
            <p className="mt-1 text-xs text-stone-500">Slug eşleşen kartlarda kullanılır.</p>
            <div className="mt-4 space-y-3">
              {categories.map((c) => (
                <form key={`cat-${c.id}`} action={saveCategory} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="name" value={c.name} />
                  <input type="hidden" name="slug" value={c.slug} />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-900">{c.name}</p>
                    <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-medium text-stone-600">{c.slug}</span>
                  </div>
                  <input
                    name="image_url"
                    defaultValue={String((c as { image_url?: string | null }).image_url ?? "")}
                    placeholder="https://… görsel URL (veya aşağıdan yükle)"
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800"
                  />
                  <div className="mt-2 flex justify-end">
                    <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                      URL'yi kaydet
                    </button>
                  </div>
                  <TaxonomyImageUploader
                    kind="category"
                    id={c.id}
                    currentImageUrl={String((c as { image_url?: string | null }).image_url ?? "")}
                  />
                </form>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/70 bg-white/95 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Koleksiyon görselleri</h2>
            <p className="mt-1 text-xs text-stone-500">Koleksiyon kartları bu alanı kullanır.</p>
            <div className="mt-4 space-y-3">
              {collections.map((c) => (
                <form key={`col-${c.id}`} action={saveCollection} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="name" value={c.name} />
                  <input type="hidden" name="slug" value={c.slug} />
                  <input type="hidden" name="description" value={String((c as { description?: string | null }).description ?? "")} />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-900">{c.name}</p>
                    <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-medium text-stone-600">{c.slug}</span>
                  </div>
                  <input
                    name="image_url"
                    defaultValue={String((c as { image_url?: string | null }).image_url ?? "")}
                    placeholder="https://… görsel URL (veya aşağıdan yükle)"
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-800"
                  />
                  <div className="mt-2 flex justify-end">
                    <button type="submit" className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                      URL'yi kaydet
                    </button>
                  </div>
                  <TaxonomyImageUploader
                    kind="collection"
                    id={c.id}
                    currentImageUrl={String((c as { image_url?: string | null }).image_url ?? "")}
                  />
                </form>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          Trendyol ve ürün yönetimi için{" "}
          <Link href="/admin/trendyol" className="font-semibold text-stone-800 underline-offset-2 hover:underline">
            Trendyol
          </Link>{" "}
          ve{" "}
          <Link href="/admin/products" className="font-semibold text-stone-800 underline-offset-2 hover:underline">
            Ürünler
          </Link>{" "}
          menüsünü kullanın.
        </p>
    </main>
  );
}
