"use client";

export function AdminProductDeleteMenuButton({ formId, productName }: { formId: string; productName: string }) {
  return (
    <button
      type="button"
      className="block w-full px-2.5 py-1.5 text-left text-[11px] font-medium text-rose-800 hover:bg-rose-50"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = window.confirm(`“${productName}” ürününü kalıcı olarak silmek istediğinize emin misiniz?`);
        if (!ok) return;
        const form = document.getElementById(formId);
        if (!(form instanceof HTMLFormElement)) {
          console.error("[AdminProductDeleteMenuButton] form bulunamadı:", formId);
          return;
        }
        form.requestSubmit();
      }}
    >
      Sil
    </button>
  );
}
