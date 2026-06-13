-- Müşteri faturası (admin PDF yükler, hesaptan görüntülenir)

alter table public.orders
  add column if not exists invoice_pdf_url text,
  add column if not exists invoice_uploaded_at timestamptz;

comment on column public.orders.invoice_pdf_url is 'Müşteri faturası PDF (Supabase Storage public URL).';
comment on column public.orders.invoice_uploaded_at is 'Fatura PDF yüklenme zamanı.';
