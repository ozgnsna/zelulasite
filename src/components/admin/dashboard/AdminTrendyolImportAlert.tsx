function decodeQueryParam(value: string | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseCount(value: string | undefined) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function AdminTrendyolImportAlert({
  tyErr,
  tyWarn,
  tyOk,
  tyPreview,
  tyImported,
  tyUpdated,
  tyDeactivated,
  tyMatch,
  tyFetched,
  tyDailySync,
  tyDailyOrders,
  tyDailyAdjusted,
  tyDailyPushed,
  tyDailyDeactivated,
  tyDailyUnmatched,
}: {
  tyErr?: string;
  tyWarn?: string;
  tyOk?: string;
  tyPreview?: string;
  tyImported?: string;
  tyUpdated?: string;
  tyDeactivated?: string;
  tyMatch?: string;
  tyFetched?: string;
  tyDailySync?: string;
  tyDailyOrders?: string;
  tyDailyAdjusted?: string;
  tyDailyPushed?: string;
  tyDailyDeactivated?: string;
  tyDailyUnmatched?: string;
}) {
  const error = decodeQueryParam(tyErr);
  const warn = decodeQueryParam(tyWarn);
  const isOk = String(tyOk ?? "").trim() === "1";
  const isPreview = String(tyPreview ?? "").trim() === "1";
  const isDailySync = String(tyDailySync ?? "").trim() === "1";
  const imported = parseCount(tyImported);
  const updated = parseCount(tyUpdated);
  const deactivated = parseCount(tyDeactivated);
  const match = parseCount(tyMatch);
  const fetched = parseCount(tyFetched);

  const dailyOrders = parseCount(tyDailyOrders);
  const dailyAdjusted = parseCount(tyDailyAdjusted);
  const dailyPushed = parseCount(tyDailyPushed);
  const dailyDeactivated = parseCount(tyDailyDeactivated);
  const dailyUnmatched = parseCount(tyDailyUnmatched);

  if (!error && !warn && !isOk && !isPreview && !isDailySync) return null;

  if (error) {
    return (
      <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="font-medium">Trendyol işlemi başarısız</p>
        <p className="mt-1 text-[13px] leading-relaxed text-red-800">{error}</p>
      </div>
    );
  }

  if (warn) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">İşlem atlandı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-amber-900">{warn}</p>
      </div>
    );
  }

  if (isPreview) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-medium">Önizleme tamamlandı (veritabanına yazılmadı)</p>
        <p className="mt-1 text-[13px] leading-relaxed text-sky-900">
          Trendyol&apos;dan {fetched ?? "—"} ürün okundu; satışta ve stokta olan{" "}
          <span className="font-semibold">{match ?? "—"}</span> ürün içe aktarılabilir. Gerçek aktarım için
          &quot;İçe aktar&quot; düğmesine basın.
        </p>
      </div>
    );
  }

  if (isDailySync) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-medium">Günlük stok eşitleme tamamlandı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-emerald-900">
          Son 24 saat Trendyol siparişlerinden <span className="font-semibold">{dailyOrders ?? 0}</span> ürün stoğu
          güncellendi. Stok uyumu: <span className="font-semibold">{dailyAdjusted ?? 0}</span> ürün, Trendyol&apos;a
          gönderim: <span className="font-semibold">{dailyPushed ?? 0}</span> ürün
          {(dailyDeactivated ?? 0) > 0 ? `, sitede kapatılan: ${dailyDeactivated}` : ""}
          {(dailyUnmatched ?? 0) > 0 ? ` · Eşleşmeyen sipariş satırı: ${dailyUnmatched}` : ""}.
        </p>
      </div>
    );
  }

  if (isOk) {
    return (
      <div role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-medium">İçe aktarma tamamlandı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-emerald-900">
          {imported ?? 0} yeni ürün eklendi, {updated ?? 0} mevcut barkod güncellendi
          {(deactivated ?? 0) > 0 ? `, ${deactivated} Trendyol bağlantısı pasife alındı` : ""}. Okunan toplam:{" "}
          {fetched ?? "—"} (içe aktarılabilir: {match ?? "—"}). Yeni kayıtlar pasif gelir; adminde açıp Trendyol&apos;a
          gönderebilirsiniz.
        </p>
      </div>
    );
  }

  return null;
}

