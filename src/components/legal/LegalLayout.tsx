import type { ReactNode } from "react";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-14">
      <article className="rounded-2xl border border-neutral-200/80 bg-neutral-50 p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        <p className="mb-4 text-xs text-neutral-400">Son güncelleme: Mayıs 2026</p>
        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" aria-hidden />
        <div className="space-y-4 text-sm leading-relaxed text-neutral-800 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h2]:first:mt-0 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_a]:font-medium [&_a]:text-amber-900 [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </div>
      </article>
    </div>
  );
}
