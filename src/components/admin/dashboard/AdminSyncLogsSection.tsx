import type { ReactNode } from "react";

export function AdminSyncLogsSection({ children }: { children: ReactNode }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);

  return (
    <div className="mt-4">
      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-center text-xs text-stone-500">
          Henüz kayıt yok. Bir senkron işlemi çalıştırdığınızda sonuçlar burada listelenir.
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1 text-xs">{children}</ul>
      )}
    </div>
  );
}
