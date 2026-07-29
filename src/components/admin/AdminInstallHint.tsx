export function AdminInstallHint() {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white/95 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-stone-900">Telefonda uygulama gibi kullan</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        Admin panelini ana ekrana ekleyerek tam ekran kısayol açabilirsiniz. Giriş yine aynı hesabınızla
        yapılır.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-stone-600">
        <li>
          <span className="font-medium text-stone-800">iPhone:</span> Safari → Paylaş → Ana Ekrana Ekle
        </li>
        <li>
          <span className="font-medium text-stone-800">Android:</span> Chrome → menü (⋮) → Ana ekrana ekle /
          Uygulamayı yükle
        </li>
      </ul>
    </div>
  );
}
