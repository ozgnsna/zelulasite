import Link from "next/link";
import { redirect } from "next/navigation";
import { saveProduct, uploadProductImage } from "@/app/actions/admin";
import { adminSecondaryButton } from "@/components/admin/products/adminFieldClasses";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ productJsonError?: string }>;
}) {
  const sp = await searchParams;
  const productJsonError = sp.productJsonError ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const admin = createAdminClient();
  const [categories, collections] = await Promise.all([
    admin.from("categories").select("*").order("name"),
    admin.from("collections").select("*").order("name"),
  ]);

  return (
    <main className="min-h-dvh bg-[#eceae6]">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl">Yeni Ürün Ekle</h1>
          <p className="mt-1 text-sm text-stone-500">Ürün ve Trendyol alanlarını tek ekranda doldurun.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/products" className={adminSecondaryButton}>
            Ürün listesi
          </Link>
          <Link href="/admin" className={adminSecondaryButton}>
            Dashboard
          </Link>
        </div>
      </div>

      {productJsonError ? (
        <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {productJsonError === "invalid_json" ? (
            <span>Trendyol kategori özellikleri geçerli bir JSON dizisi olmalı.</span>
          ) : productJsonError === "invalid_type" ? (
            <span>Trendyol kategori özellikleri yalnızca köşeli parantezli bir dizi ([...]) olmalıdır.</span>
          ) : (
            <span>Kayıt doğrulanamadı.</span>
          )}
        </div>
      ) : null}

      <ProductForm
        mode="create"
        categories={(categories.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
        collections={(collections.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
        returnTo="/admin/products/new"
        uploadProductImageAction={uploadProductImage}
        saveProductAction={saveProduct}
      />
    </div>
    </main>
  );
}
