"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  formId: string;
};

export function AdminProductsSelectionToolbar({ formId }: Props) {
  const [selected, setSelected] = useState(0);

  const refresh = useCallback(() => {
    const root = document.getElementById(formId);
    if (!root || !(root instanceof HTMLFormElement)) {
      setSelected(0);
      return;
    }
    const boxes = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="product_ids"]');
    let n = 0;
    boxes.forEach((cb) => {
      if (cb.checked) n += 1;
    });
    setSelected(n);
  }, [formId]);

  useEffect(() => {
    const root = document.getElementById(formId);
    if (!root) return;
    refresh();
    root.addEventListener("change", refresh);
    return () => root.removeEventListener("change", refresh);
  }, [formId, refresh]);

  const onSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const root = document.getElementById(formId);
      if (!root || !(root instanceof HTMLFormElement)) return;
      const checked = e.target.checked;
      root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="product_ids"]').forEach((cb) => {
        cb.checked = checked;
      });
      refresh();
    },
    [formId, refresh],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-stone-700">
        <input type="checkbox" className="size-4 rounded border-stone-300 text-stone-900" onChange={onSelectAll} aria-label="Tümünü seç" />
        Tümünü seç
      </label>
      <span className="text-[11px] font-medium text-stone-600">
        <span className="tabular-nums font-bold text-stone-900">{selected}</span> ürün seçildi
      </span>
    </div>
  );
}
