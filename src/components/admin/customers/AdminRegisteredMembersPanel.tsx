import Link from "next/link";
import type { RegisteredMemberRow } from "@/lib/admin/fetch-registered-members";
import { formatTry } from "@/lib/money";

const ERROR_MESSAGES: Record<string, string> = {
  missing_user: "Müşteri seçilmedi.",
  user_not_found: "Müşteri hesabı bulunamadı.",
  admin_target: "Admin hesaplarına müşteri olarak girilemez.",
  link_failed: "Oturum bağlantısı oluşturulamadı.",
  session_failed: "Müşteri oturumu başlatılamadı.",
};

export function AdminRegisteredMembersPanel({
  members,
  totalUsers,
  q,
  errorCode,
  loadError,
}: {
  members: RegisteredMemberRow[];
  totalUsers: number;
  q: string;
  errorCode: string | null;
  loadError: string | null;
}) {
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? "İşlem tamamlanamadı." : null;

  return (
    <section className="mt-3 rounded-xl border border-stone-200/60 bg-white/90 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100/90 px-2.5 py-1.5">
        <div>
          <h2 className="text-[11px] font-semibold text-stone-800">Kayıtlı üyeler</h2>
          <p className="text-[9px] text-stone-500">
            Siteye kayıt olan hesaplar · toplam {totalUsers.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      <form method="get" className="border-b border-stone-100/90 px-2.5 py-2">
        <label className="block text-[9px] font-semibold uppercase tracking-wide text-stone-500">Üye ara</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="İsim, e-posta veya telefon…"
            className="min-w-[12rem] flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-800 outline-none focus:border-stone-400"
          />
          <button
            type="submit"
            className="rounded-md border border-stone-800/15 bg-stone-900 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-stone-800"
          >
            Ara
          </button>
          {q ? (
            <Link
              href="/admin/customers"
              className="rounded-md border border-stone-200 px-3 py-1.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-50"
            >
              Temizle
            </Link>
          ) : null}
        </div>
      </form>

      {loadError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-950" role="alert">
          Üye listesi yüklenemedi: {loadError}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="border-b border-rose-100 bg-rose-50 px-2.5 py-2 text-[11px] text-rose-900" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {members.length === 0 ? (
        <div className="px-2.5 py-4 text-center">
          <p className="text-[12px] font-medium text-stone-700">
            {q ? "Arama sonucu bulunamadı." : "Henüz kayıtlı üye yok."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-[11px]">
            <thead className="border-b border-stone-100 bg-stone-50/80 text-[9px] uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-2.5 py-2 font-medium">Üye</th>
                <th className="px-2.5 py-2 font-medium">Kayıt</th>
                <th className="px-2.5 py-2 font-medium">Sipariş</th>
                <th className="px-2.5 py-2 font-medium">Kupon</th>
                <th className="px-2.5 py-2 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/90">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/60">
                  <td className="px-2.5 py-2">
                    <p className="font-semibold text-stone-900">{m.fullName}</p>
                    <p className="text-[10px] text-stone-500">{m.email || "—"}</p>
                    {m.phone ? <p className="text-[10px] text-stone-400">{m.phone}</p> : null}
                    {m.isAdminAccount ? (
                      <span className="mt-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-medium text-stone-600">
                        Admin
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums text-stone-600">
                    {m.registeredAt
                      ? new Date(m.registeredAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-2.5 py-2 text-stone-600">
                    {m.totalOrders > 0 ? (
                      <>
                        {m.paidOrders} ödendi
                        {m.totalOrders !== m.paidOrders ? ` · ${m.totalOrders} toplam` : ""}
                      </>
                    ) : (
                      <span className="text-stone-400">Sipariş yok</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-stone-600">
                    {m.giftCardBalanceTry > 0 ? formatTry(m.giftCardBalanceTry) : "—"}
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    {m.isAdminAccount ? (
                      <span className="text-[10px] text-stone-400">—</span>
                    ) : (
                      <Link
                        href={`/api/admin/impersonate?userId=${encodeURIComponent(m.id)}&next=${encodeURIComponent("/hesabim")}`}
                        className="inline-flex rounded-md border border-[#6b5b45]/20 bg-[#fcf8f1] px-2 py-1 text-[10px] font-semibold text-[#4a3f31] hover:bg-[#f5ecdf]"
                      >
                        Hesaba gir
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
