import { updateOrderShippingTrackingAction } from "@/app/actions/admin";
import { resolveOrderTrackingUrl } from "@/lib/orders/shipping-tracking";

export function AdminOrderShippingTrackingForm({
  orderId,
  paymentStatus,
  shippingProvider,
  shippingTrackingNumber,
  shippingLabelUrl,
  returnTo,
}: {
  orderId: string;
  paymentStatus: string;
  shippingProvider?: string | null;
  shippingTrackingNumber?: string | null;
  shippingLabelUrl?: string | null;
  returnTo: string;
}) {
  if (paymentStatus !== "paid") return null;

  const previewUrl = resolveOrderTrackingUrl({
    shipping_provider: shippingProvider,
    shipping_tracking_number: shippingTrackingNumber,
    shipping_label_url: shippingLabelUrl,
  });
  const isMock = /^DHL-MOCK-/i.test(String(shippingTrackingNumber ?? "").trim());

  return (
    <form action={updateOrderShippingTrackingAction} className="rounded-xl border border-[#eadfce]/90 bg-[#fffdfb] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">DHL kargo bilgisi</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        Gerçek DHL takip numarasını girin. Takip linki otomatik oluşturulur; isterseniz özel link de yazabilirsiniz.
      </p>
      {isMock ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Bu siparişte test/mock takip numarası var. Canlı DHL kodunu aşağıya girin.
        </p>
      ) : null}
      <input type="hidden" name="id" value={orderId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="mt-3 space-y-3">
        <label className="block text-xs font-medium text-stone-700">
          DHL kargo kodu
          <input
            name="tracking_number"
            defaultValue={shippingTrackingNumber ?? ""}
            placeholder="ör. 1234567890"
            className="mt-1 w-full rounded-lg border border-[#e7ded2] bg-white px-3 py-2 font-mono text-sm text-stone-900"
            required
          />
        </label>
        <label className="block text-xs font-medium text-stone-700">
          Takip linki (isteğe bağlı)
          <input
            name="tracking_url"
            defaultValue={previewUrl && !previewUrl.includes("example.invalid") ? previewUrl : ""}
            placeholder="Boş bırakılırsa DHL linki otomatik"
            className="mt-1 w-full rounded-lg border border-[#e7ded2] bg-white px-3 py-2 text-sm text-stone-900"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-stone-700">
          <input type="checkbox" name="notify_customer" value="1" className="size-4 rounded border-stone-300" />
          Müşteriye kargo bildirimi gönder (WhatsApp)
        </label>
      </div>
      <button
        type="submit"
        className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800"
      >
        Kargo bilgisini kaydet
      </button>
    </form>
  );
}
