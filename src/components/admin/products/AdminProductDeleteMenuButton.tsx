"use client";

export function AdminProductDeleteMenuButton({ formId, productName }: { formId: string; productName: string }) {
  return (
    <button
      type="submit"
      form={formId}
      className="block w-full px-2.5 py-1.5 text-left text-[11px] font-medium text-rose-800 hover:bg-rose-50"
      onClick={(e) => {
        const ok = window.confirm(`“${productName}” ürününü kalıcı olarak silmek istediğinize emin misinuz?`);
        if (!ok) e.preventDefault();
      }}
    >
      Sil
    </button>
  );
}
