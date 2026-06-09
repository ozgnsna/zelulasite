"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { openCookieSettingsFromUi } from "@/lib/cookies/consent";
import {
  getSupportPhoneDisplay,
  getSupportWhatsAppHref,
  getSupportWhatsAppNumber,
} from "@/lib/support-contact";
import { trackInstagramClick, trackWhatsAppClick } from "@/lib/analytics";

const linkClass =
  "text-sm text-stone-600 transition hover:text-stone-900 hover:underline underline-offset-2 decoration-stone-400/80";

const whatsappDefaultText =
  "Merhaba Zelula, ürünler hakkında bilgi almak istiyorum.";
const whatsappHref = getSupportWhatsAppHref(whatsappDefaultText);

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const instagramHref = "https://www.instagram.com/zelulaofficial";

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50">
      <div className="container-premium px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-3">
            <p className="text-base font-bold tracking-tight text-stone-900">Zelula</p>
            <p className="text-sm font-medium italic text-stone-700">&quot;Takı değil, bir his.&quot;</p>
            <p className="max-w-xs text-sm leading-relaxed text-stone-600">
              Zelula, zamansız tasarımlarıyla günlük stiline zarif bir dokunuş katar.
            </p>
            <div className="relative mt-4 h-10 w-[140px] opacity-90 sm:h-11 sm:w-[160px]">
              <Image
                src="/zelula-logo-full.svg"
                alt=""
                fill
                className="object-contain object-left"
                sizes="160px"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Hızlı erişim</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <Link href="/urunler" className={linkClass}>
                  Tüm Ürünler
                </Link>
              </li>
              <li>
                <Link href="/urunler?sirala=newest" className={linkClass}>
                  Yeni Gelenler
                </Link>
              </li>
              <li>
                <Link href="/cok-satanlar" className={linkClass}>
                  En Çok Satanlar
                </Link>
              </li>
              <li>
                <Link href="/urunler" className={linkClass}>
                  Kampanyalar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Destek</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <Link href="/mesafeli-satis-sozlesmesi" className={linkClass}>
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/on-bilgilendirme-formu" className={linkClass}>
                  Ön Bilgilendirme Formu
                </Link>
              </li>
              <li>
                <Link href="/iade-ve-degisim" className={linkClass}>
                  İade &amp; Değişim
                </Link>
              </li>
              <li>
                <Link href="/gizlilik-politikasi" className={linkClass}>
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openCookieSettingsFromUi()}
                  className={`${linkClass} text-left`}
                >
                  Çerez Ayarları
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-sm text-stone-600">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">İletişim</p>
            <p>
              <span className="text-stone-500">E-posta: </span>
              <a href="mailto:destek@zeluladesign.com" className={`${linkClass} inline font-medium`}>
                destek@zeluladesign.com
              </a>
            </p>
            <p>
              <span className="text-stone-500">Telefon: </span>
              <a href={`tel:+${getSupportWhatsAppNumber()}`} className={`${linkClass} inline font-medium`}>
                {getSupportPhoneDisplay()}
              </a>
            </p>
            <p>
              <span className="text-stone-500">Adres: </span>
              <span className="text-stone-700">Beylerbeyi Mah. Arabacılar Sok. No:39/1 Üsküdar / İstanbul</span>
            </p>
            <p>
              <span className="text-stone-500">Instagram: </span>
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline font-semibold text-[#8b5a2b] underline decoration-[#c6a15b]/70 underline-offset-2 transition hover:text-[#6b4320]"
                onClick={() =>
                  trackInstagramClick({ location: "footer_contact", href: instagramHref })
                }
              >
                @zelulaofficial
              </a>
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex min-w-0 max-w-full items-center gap-2 text-sm font-medium text-green-600 underline-offset-2 transition hover:text-green-700 hover:underline"
              onClick={() =>
                trackWhatsAppClick({ location: "footer_support", href: whatsappHref })
              }
            >
              <WhatsAppIcon className="shrink-0 text-[#25D366]" />
              <span className="min-w-0 break-words">WhatsApp ile hızlı destek al</span>
            </a>
            <p className="text-xs text-stone-500">Instagram DM&apos;den %10 indirim al 🎁</p>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200/90 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700">
              14 Gün Kolay İade
            </span>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700">
              Güvenli Ödeme
            </span>
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-neutral-700">
              Hızlı Kargo
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-[#f4f2ef] px-6 py-3">
        <div className="container-premium text-center text-xs text-stone-600 sm:text-left">
          <p>© 2026 Zelula. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
