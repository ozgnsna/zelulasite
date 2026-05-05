import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-stone-200/90 bg-[#fffdfb]/95 shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm">
        <div className="container-premium flex h-[3.25rem] items-center gap-3 py-1.5 sm:h-14 sm:py-2">
          <Link
            href="/"
            className="flex h-8 max-w-[min(200px,52vw)] shrink-0 items-center sm:h-9 md:h-10 md:max-w-[220px]"
            aria-label="Zelula — ana sayfa"
          >
            <Image
              src="/zelula-logo-header.svg"
              alt="Zelula"
              width={220}
              height={42}
              className="h-full w-auto object-contain object-left"
              sizes="(max-width: 640px) 160px, 220px"
              priority
            />
          </Link>
          <span className="hidden h-6 shrink-0 border-l border-stone-200 pl-3 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500 sm:inline sm:text-[11px]">
            Yönetim
          </span>
        </div>
      </header>
      {children}
    </>
  );
}
