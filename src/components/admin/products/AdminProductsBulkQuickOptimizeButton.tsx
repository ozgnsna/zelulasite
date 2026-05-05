"use client";

type Props = {
  formId: string;
};

/**
 * Seçili ürünlerde ilk kaydı düzenleme ekranına gönderir; kuyruk sessionStorage'da (isteğe bağlı zincir).
 */
export function AdminProductsBulkQuickOptimizeButton({ formId }: Props) {
  return (
    <button
      type="button"
      className="rounded-lg border border-violet-400/80 bg-gradient-to-b from-violet-100 to-violet-200/90 px-3 py-2 text-[11px] font-bold text-violet-950 shadow-sm ring-1 ring-violet-400/25 transition hover:from-violet-50 hover:to-violet-100"
      onClick={() => {
        const root = document.getElementById(formId);
        if (!root || !(root instanceof HTMLFormElement)) return;
        const ids = [
          ...root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="product_ids"]:checked'),
        ]
          .map((cb) => String(cb.value).trim())
          .filter(Boolean);
        if (ids.length === 0) {
          window.alert("Önce en az bir ürün seç.");
          return;
        }
        const [first, ...rest] = ids;
        try {
          if (rest.length > 0) {
            sessionStorage.setItem("zelula_bulk_optimize_queue", JSON.stringify(rest));
          } else {
            sessionStorage.removeItem("zelula_bulk_optimize_queue");
          }
        } catch {
          /* ignore */
        }
        window.location.assign(`/admin/products/${encodeURIComponent(first)}/edit?quickOptimize=1`);
      }}
    >
      Toplu hızlı optimize
    </button>
  );
}
