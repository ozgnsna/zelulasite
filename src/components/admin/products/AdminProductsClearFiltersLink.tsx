"use client";

import { useRouter } from "next/navigation";

/** Filtre URL parametrelerini temizler; form alanlarinin da sifirlanmasi icin sayfayi yeniden yukler. */
export function AdminProductsClearFiltersLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        router.replace("/admin/products");
        router.refresh();
      }}
      className="inline-flex h-7 shrink-0 items-center rounded-md border border-transparent px-2 text-[11px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
    >
      Temizle
    </button>
  );
}
