import type { ReactNode } from "react";

export function AdminSyncLogsSection({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-stone-500">Entegrasyon logları</p>
      <ul className="mt-2 space-y-1.5 text-xs">{children}</ul>
    </div>
  );
}
