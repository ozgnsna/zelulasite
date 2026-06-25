/** Sabit üst şerit yüksekliği — duyuru + (opsiyonel) impersonation bandı + header. */
export function siteChromePaddingClass(impersonating: boolean): string {
  if (impersonating) {
    return "pt-[calc(2.25rem+2.5rem+3.25rem)] sm:pt-[calc(2.5rem+2.5rem+3.5rem)]";
  }
  return "pt-[calc(2.25rem+3.25rem)] sm:pt-[calc(2.5rem+3.5rem)]";
}
