"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
const SIGN_OUT_ACTION = "/auth/signout";
const IMPERSONATION_EXIT_HREF = "/api/admin/impersonate/exit";
import {
  categoryHref,
  getTaxonBySlug,
  HEADER_PRIMARY_LEAF_SLUGS,
  MEGA_MENU_GROUPS,
} from "@/lib/categories/taxonomy";
import { cn } from "@/lib/utils";
import { HeaderSearch } from "@/components/header/HeaderSearch";

const AUTH_NEXT = encodeURIComponent("/hesabim");
const GIRIS_HREF = `/giris?next=${AUTH_NEXT}`;

function useClickOutsideRef<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  const onOutsideRef = useRef(onOutside);
  useEffect(() => {
    onOutsideRef.current = onOutside;
  });
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      onOutsideRef.current();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return ref;
}

export function HeaderShell({
  isLoggedIn,
  greetingFirstName,
  cartSlot,
  impersonationActive = false,
}: {
  isLoggedIn: boolean;
  greetingFirstName: string | null;
  cartSlot: React.ReactNode;
  impersonationActive?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const accountWrapRef = useClickOutsideRef<HTMLDivElement>(() => setAccountOpen(false));
  const megaWrapRef = useClickOutsideRef<HTMLDivElement>(() => setMegaOpen(false));

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const accountLabel = isLoggedIn
    ? greetingFirstName
      ? `Merhaba, ${greetingFirstName}`
      : "Hesabım"
    : "Giriş yap / Üye ol";

  return (
    <>
      <div className="container-premium relative z-[41] flex h-14 min-h-14 items-center gap-2 py-0 md:gap-3 lg:gap-4">
        <Link
          href="/"
          className="header-logo-link flex h-8 max-w-[min(168px,46vw)] shrink-0 items-center py-1 sm:h-9 sm:max-w-[min(200px,40vw)] md:h-10 md:max-w-[220px]"
          aria-label="Zelula — Ana sayfa"
        >
          <Image
            src="/zelula-logo-header.svg"
            alt="Zelula"
            width={220}
            height={42}
            className="header-logo-img h-full w-auto object-contain object-left"
            sizes="(max-width: 768px) 168px, 220px"
            fetchPriority="low"
          />
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center overflow-hidden md:flex md:px-1 lg:px-2">
          <nav
            className="relative flex max-w-full flex-nowrap items-center justify-center gap-x-0.5 overflow-x-auto [scrollbar-width:none] lg:gap-1 xl:gap-1.5 [&::-webkit-scrollbar]:hidden"
            aria-label="Kategoriler"
          >
            {HEADER_PRIMARY_LEAF_SLUGS.map((slug) => {
              const t = getTaxonBySlug(slug);
              if (!t) return null;
              return (
                <Link
                  key={slug}
                  href={categoryHref(slug)}
                  className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-2 py-2 text-[10px] font-medium tracking-wide text-stone-700 transition hover:bg-[#f4f0ea] hover:text-stone-900 lg:px-2.5 lg:text-[11px] xl:text-xs"
                >
                  {t.name}
                </Link>
              );
            })}
            <Link
              href="/cok-satanlar"
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-2 py-2 text-[10px] font-medium tracking-wide text-[#7a5f38] ring-1 ring-[color:var(--brand-gold)]/35 transition hover:bg-[#f4f0ea] hover:ring-[color:var(--brand-gold)]/50 lg:px-2.5 lg:text-[11px] xl:text-xs"
            >
              Çok Satanlar
            </Link>
            <div
              ref={megaWrapRef}
              className="relative"
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
            >
              <button
                type="button"
                aria-expanded={megaOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-11 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-2 text-[10px] font-medium tracking-wide text-stone-700 transition hover:bg-[#f4f0ea] hover:text-stone-900 lg:px-2.5 lg:text-[11px] xl:text-xs"
                onClick={() => setMegaOpen((o) => !o)}
              >
                Tüm Ürünler
                <ChevronDown className={cn("h-3 w-3 opacity-50 transition", megaOpen && "rotate-180")} aria-hidden />
              </button>
              {megaOpen ? (
                <div
                  role="menu"
                  className="absolute left-1/2 top-[calc(100%+0.25rem)] z-50 min-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 pt-1"
                >
                  <div className="rounded-2xl border border-[#e8dfd3] bg-[#fffdfb] p-5 shadow-[0_16px_48px_rgba(55,48,40,0.12)]">
                    <div className="grid grid-cols-2 gap-6">
                      {MEGA_MENU_GROUPS.map((group) => (
                        <div key={group.title}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                            {group.title}
                          </p>
                          <ul className="mt-3 space-y-0.5">
                            {group.slugs.map((s) => {
                              const tax = getTaxonBySlug(s);
                              if (!tax) return null;
                              return (
                                <li key={s}>
                                  <Link
                                    role="menuitem"
                                    href={categoryHref(s)}
                                    className="block rounded-lg px-2 py-1.5 text-sm text-stone-800 transition hover:bg-[#faf6ef]"
                                    onClick={() => setMegaOpen(false)}
                                  >
                                    {tax.name}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-[#ebe6df] pt-3 text-center">
                      <Link
                        href="/urunler"
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-gold-a11y underline-offset-4 transition hover:underline"
                        onClick={() => setMegaOpen(false)}
                      >
                        Tümünü gör
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2 sm:gap-2 md:pl-4 lg:pl-6">
          <HeaderSearch />

          <button
            type="button"
            className="touch-target shrink-0 rounded-full border border-[#e5dcd0]/90 bg-white/90 text-stone-800 shadow-sm transition hover:border-stone-300 md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="relative hidden md:block" ref={accountWrapRef}>
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="inline-flex min-h-11 max-w-[11rem] items-center gap-1 rounded-full border border-[#e5dcd0]/90 bg-white/90 px-3 py-2 text-xs font-medium text-stone-800 shadow-sm transition hover:border-[color:var(--brand-gold)]/35 hover:text-stone-900"
                >
                  <UserRound className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{accountLabel}</span>
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition", accountOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[11.5rem] rounded-xl border border-[#e8dfd3] bg-[#fffdfb] py-1.5 text-sm shadow-[0_12px_32px_rgba(62,52,38,0.12)]"
                  >
                    <Link
                      role="menuitem"
                      href="/hesabim#profil"
                      className="block px-4 py-2 text-stone-700 transition hover:bg-[#faf6ef] hover:text-stone-900"
                      onClick={() => setAccountOpen(false)}
                    >
                      Profilim
                    </Link>
                    <Link
                      role="menuitem"
                      href="/hesabim#siparisler"
                      className="block px-4 py-2 text-stone-700 transition hover:bg-[#faf6ef] hover:text-stone-900"
                      onClick={() => setAccountOpen(false)}
                    >
                      Siparişlerim
                    </Link>
                    <Link
                      role="menuitem"
                      href="/hesabim#adreslerim"
                      className="block px-4 py-2 text-stone-700 transition hover:bg-[#faf6ef] hover:text-stone-900"
                      onClick={() => setAccountOpen(false)}
                    >
                      Adreslerim
                    </Link>
                    <Link
                      role="menuitem"
                      href="/hesabim#zelula-puan"
                      className="block px-4 py-2 text-stone-700 transition hover:bg-[#faf6ef] hover:text-stone-900"
                      onClick={() => setAccountOpen(false)}
                    >
                      Puanlarım
                    </Link>
                    <Link
                      role="menuitem"
                      href="/hesabim#favorilerim"
                      className="block px-4 py-2 text-stone-700 transition hover:bg-[#faf6ef] hover:text-stone-900"
                      onClick={() => setAccountOpen(false)}
                    >
                      Favorilerim
                    </Link>
                    <div className="my-1 border-t border-[#ebe6df]" />
                    {impersonationActive ? (
                      <Link
                        role="menuitem"
                        href={IMPERSONATION_EXIT_HREF}
                        className="block px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50"
                      >
                        Admin oturumuna dön
                      </Link>
                    ) : (
                      <form action={SIGN_OUT_ACTION} method="post">
                        <button
                          type="submit"
                          role="menuitem"
                          className="w-full px-4 py-2 text-left text-sm text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                        >
                          Çıkış yap
                        </button>
                      </form>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <Link
                href={GIRIS_HREF}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#e5dcd0]/90 bg-white/90 px-3 py-2 text-xs font-medium text-stone-800 shadow-sm transition hover:border-[color:var(--brand-gold)]/35 hover:text-stone-900"
              >
                <UserRound className="h-3.5 w-3.5 opacity-70" aria-hidden />
                <span className="hidden lg:inline">{accountLabel}</span>
                <span className="lg:hidden">Giriş</span>
              </Link>
            )}
          </div>

          {cartSlot}
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-r border-[#e8dfd3] bg-[#fffdfb] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ebe6df] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">Menü</span>
              <button
                type="button"
                className="touch-target rounded-full border border-stone-200 text-stone-700"
                onClick={() => setMobileOpen(false)}
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Kategoriler ve hesap">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Takılar</p>
              <ul className="mt-2 space-y-0.5">
                {HEADER_PRIMARY_LEAF_SLUGS.map((slug) => {
                  const t = getTaxonBySlug(slug);
                  if (!t) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={categoryHref(slug)}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-[#faf6ef]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {t.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">Aksesuar</p>
              <ul className="mt-2 space-y-0.5">
                {(["bros", "sapka", "anahtarlik"] as const).map((slug) => {
                  const t = getTaxonBySlug(slug);
                  if (!t) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={categoryHref(slug)}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-[#faf6ef]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {t.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-4 space-y-0.5 border-t border-[#ebe6df] pt-4">
                <li>
                  <Link
                    href="/cok-satanlar"
                    className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-[#7a5f38] transition hover:bg-[#faf6ef]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Çok Satanlar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/urunler"
                    className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-[#faf6ef]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Tüm Ürünler
                  </Link>
                </li>
                <li>
                  <Link
                    href={categoryHref("takilar")}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-xs text-stone-600 transition hover:bg-[#faf6ef]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Takılar — tümü
                  </Link>
                </li>
                <li>
                  <Link
                    href={categoryHref("aksesuar")}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-xs text-stone-600 transition hover:bg-[#faf6ef]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Aksesuar — tümü
                  </Link>
                </li>
              </ul>
              <div className="my-4 border-t border-[#ebe6df]" />
              {isLoggedIn ? (
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href="/hesabim#profil"
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-stone-800 hover:bg-[#faf6ef]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Profilim
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/hesabim#siparisler"
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-stone-800 hover:bg-[#faf6ef]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Siparişlerim
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/hesabim#adreslerim"
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-stone-800 hover:bg-[#faf6ef]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Adreslerim
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/hesabim#zelula-puan"
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-stone-800 hover:bg-[#faf6ef]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Puanlarım
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/hesabim#favorilerim"
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm text-stone-800 hover:bg-[#faf6ef]"
                      onClick={() => setMobileOpen(false)}
                    >
                      Favorilerim
                    </Link>
                  </li>
                  <li className="pt-2">
                    {impersonationActive ? (
                      <Link
                        href={IMPERSONATION_EXIT_HREF}
                        className="block rounded-lg px-3 py-2.5 text-left text-sm font-medium text-amber-900 hover:bg-amber-50"
                      >
                        Admin oturumuna dön
                      </Link>
                    ) : (
                      <form action={SIGN_OUT_ACTION} method="post">
                        <button
                          type="submit"
                          className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-600 hover:bg-stone-50"
                        >
                          Çıkış yap
                        </button>
                      </form>
                    )}
                  </li>
                </ul>
              ) : (
                <div className="space-y-2 px-1">
                  <Link
                    href={GIRIS_HREF}
                    className="block rounded-full border border-[#e5dcd0] bg-white px-4 py-2.5 text-center text-sm font-medium text-stone-900 shadow-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Giriş yap / Üye ol
                  </Link>
                  <Link
                    href="/kayit"
                    className="block rounded-full px-4 py-2 text-center text-xs text-stone-600 underline-offset-2 hover:underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    Hızlı kayıt
                  </Link>
                </div>
              )}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
