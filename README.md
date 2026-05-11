# Zelula MVP (Next.js + Supabase)

Premium Türk takı markası için hazırlanmış, mobil-first ve conversion odaklı e-ticaret MVP.

## Özellikler

- Next.js App Router + TypeScript + Tailwind
- Supabase (DB + Auth + Storage)
- Homepage, collection, product detail, cart, checkout, success/failure pages
- Auth korumalı admin panel:
  - ürün CRUD
  - kategori/kolleksiyon yönetimi
  - sipariş durum güncelleme
  - Supabase Storage görsel yükleme
- Ödeme (QNB Finansbank vPOS / 3D Host):
  - `src/lib/payments/types.ts`
  - `src/lib/payments/provider.ts`
  - `src/lib/payments/qnb-finansbank.ts`
- SEO:
  - metadata
  - temiz URL
  - `sitemap.ts`
- Analytics funnel:
  - `view_item`
  - `view_item_list`
  - `add_to_cart`
  - `remove_from_cart`
  - `begin_checkout`
  - `purchase`

## Kurulum

1. `npm install`
2. `.env.example` dosyasını `.env.local` olarak kopyalayın.
3. Supabase SQL Editor’da:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
4. Supabase Storage bucket oluşturun: `product-images` (public).
5. Supabase Auth üzerinden en az bir admin kullanıcı açın.
6. `npm run dev`

## Admin erişimi

- `/admin/login`
- Opsiyonel whitelist: `.env.local` içinde `ADMIN_EMAILS`

## Vercel deploy

- Tüm `.env.example` değişkenlerini Vercel Environment Variables bölümüne ekleyin.
- Supabase URL/keys ve payment env’leri olmadan ödeme katmanı başlatılmaz.

## Notlar

- Kart ödemesi: QNB vPOS; varsayılan **3DPay** (kart `/odeme/qnb-baslat/[id]` üzerinde, sonra bankaya POST). İstenirse `QNB_SECURE_TYPE=3DHost` (kart tamamen bankada). Dönüş: `POST /api/payments/qnb-return`.
- Dönüş işleme idempotenttir (`payment_logs.callback_hash` unique index).
- Yerelde QNB anahtarı olmadan denemek için `.env.local` içinde `QNB_USE_MOCK="true"` kullanılabilir.
- Supabase Security Advisor notu: Free planda `Leaked Password Protection` açılamaz. Pro plan ve üzeri pakete geçildiğinde `Authentication > Attack Protection > Prevent use of leaked passwords` etkinleştirilmelidir.

## Reconciliation için kritik kolonlar

- `orders.order_number`: operasyonel sipariş referansı
- `orders.payment_provider + orders.payment_reference`: sağlayıcı bazlı benzersiz ödeme referansı
- `orders.payment_status` / `orders.order_status`: finansal ve lojistik durum
- `payment_logs.callback_hash`: callback idempotency anahtarı
- `payment_logs.callback_payload`: ham callback JSON kaydı (audit trail)
- `payment_logs.verification_status`: imza/doğrulama sonucu

## Analytics notları

- Merkezi utility: `src/lib/analytics.ts`
- App Router page view tracking: `src/components/analytics/AnalyticsProvider.tsx`
- GA entegrasyonu `NEXT_PUBLIC_GA_MEASUREMENT_ID` tanımlıysa otomatik aktif olur.
- Debug mod: `NEXT_PUBLIC_ANALYTICS_DEBUG=true`
