"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { openCookieSettingsFromUi } from "@/lib/cookies/consent";
import {
  getSupportPhoneDisplay,
  getSupportWhatsAppHref,
  getSupportWhatsAppNumber,
} from "@/lib/support-contact";
import { trackInstagramClick, trackWhatsAppClick } from "@/lib/analytics";
import { PaymentTrustStrip } from "@/components/payments/PaymentTrustStrip";

const linkClass =
  "text-sm text-stone-600 transition hover:text-stone-900 hover:underline underline-offset-2 decoration-stone-400/80";

const whatsappDefaultText =
  "Merhaba Zelula, ürünler hakkında bilgi almak istiyorum.";
const whatsappHref = getSupportWhatsAppHref(whatsappDefaultText);

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

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

          <div className="text-sm text-stone-600">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">İletişim</p>

            <div className="mt-4 space-y-3.5 rounded-2xl border border-neutral-200 bg-white/70 p-4 sm:space-y-3 sm:border-0 sm:bg-transparent sm:p-0">
              <div className="flex items-start gap-2.5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400">Ünvan</p>
                  <p className="text-stone-700">Özgün Sena Uğur (Şahıs Firması)</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400">E-posta</p>
                  <a href="mailto:destek@zeluladesign.com" className={`${linkClass} inline font-medium break-all`}>
                    destek@zeluladesign.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400">Telefon</p>
                  <a href={`tel:+${getSupportWhatsAppNumber()}`} className={`${linkClass} inline font-medium`}>
                    {getSupportPhoneDisplay()}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400">Adres</p>
                  <p className="text-stone-700">Beylerbeyi Mah. Arabacılar Sok. No:39/1 Üsküdar / İstanbul</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <InstagramIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400">Instagram</p>
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
                </div>
              </div>
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100 sm:w-auto"
              onClick={() =>
                trackWhatsAppClick({ location: "footer_support", href: whatsappHref })
              }
            >
              <WhatsAppIcon className="shrink-0 text-[#25D366]" />
              <span>WhatsApp ile hızlı destek</span>
            </a>

            <p className="mt-3 text-xs text-stone-500">Instagram DM&apos;den %10 indirim al 🎁</p>
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
            <a
              href="https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=a9896602-4d10-4e94-ae5c-ad5e17d43c3b"
              target="_blank"
              rel="noopener noreferrer"
              title="Sitemizin ETBİS kaydını T.C. Ticaret Bakanlığı sisteminde doğrulayın"
              className="inline-flex items-center gap-2 rounded-full border border-[#c6a15b] bg-gradient-to-r from-[#f6edda] to-[#fbf7f0] px-3.5 py-1.5 shadow-sm transition hover:from-[#f0e2c5] hover:to-[#f6edda]"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#8b5a2b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="flex flex-col leading-tight text-left">
                <span className="text-[11px] font-bold text-[#7a5320]">ETBİS&apos;e Kayıtlıdır</span>
                <span className="text-[8.5px] font-medium uppercase tracking-[0.08em] text-[#a07d4a]">
                  T.C. Ticaret Bakanlığı
                </span>
              </span>
            </a>
          </div>

          <div className="mt-5">
            <PaymentTrustStrip />
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
