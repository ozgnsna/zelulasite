"use client";

import { loadTrendyolCategoryAttributePickerRowsAction } from "@/app/actions/admin";
import { adminSecondaryButton } from "@/components/admin/products/adminFieldClasses";
import type { TrendyolCategoryAttributePickerRow } from "@/lib/marketplaces/trendyol/categories";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

type SelEntry = { mode: "none" } | { mode: "value"; valueId: number } | { mode: "custom"; custom: string };

type SelMap = Map<number, SelEntry>;

/** Zorunlu olmayan alanlar içinde “teknik detay” hissi veren isimler (API’ye dokunulmadan UI gruplaması). */
const TECHNICAL_NAME_HINT =
  /(menşe|mense|origin|ağırlık|weight|desi|ean|gtin|web\s*color|renk\s*kodu|ebat|boyut|hacim|volume|cm\b|mm\b|inch|piksel|pixel|fatura|invoice|ambalaj|package|derinlik|genişlik|yükseklik|\bkg\b|gram|gönderi|shipment|sku\s*tip|varyant\s*kod)/i;

function parseProductAttrs(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
}

function readParsedAttrsFromTextarea(): Array<Record<string, unknown>> {
  const el = document.getElementById("trendyol_category_attributes");
  if (!(el instanceof HTMLTextAreaElement)) return [];
  try {
    const j = JSON.parse(el.value || "[]");
    if (!Array.isArray(j)) return [];
    return j.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

function extrasNotManagedByRows(
  parsed: Array<Record<string, unknown>>,
  rows: TrendyolCategoryAttributePickerRow[],
): Array<Record<string, unknown>> {
  const managed = new Set(rows.map((r) => r.attributeId));
  return parsed.filter((x) => !managed.has(Number((x as Record<string, unknown>).attributeId ?? 0)));
}

function buildInitialSelection(
  rows: TrendyolCategoryAttributePickerRow[],
  attrs: Array<Record<string, unknown>>,
): SelMap {
  const map: SelMap = new Map();
  const ids = new Set(rows.map((r) => r.attributeId));
  for (const row of attrs) {
    const aid = Number(row.attributeId ?? 0);
    if (!aid || !ids.has(aid)) continue;
    const vid = row.attributeValueId;
    const custom = row.customAttributeValue;
    if (vid != null && Number(vid) > 0) {
      map.set(aid, { mode: "value", valueId: Number(vid) });
    } else if (custom != null && String(custom).trim()) {
      map.set(aid, { mode: "custom", custom: String(custom).trim() });
    }
  }
  return map;
}

function buildJsonPayload(
  rows: TrendyolCategoryAttributePickerRow[],
  sel: SelMap,
  extra: Array<Record<string, unknown>>,
): string {
  const picked: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const s = sel.get(r.attributeId);
    if (!s || s.mode === "none") continue;
    if (s.mode === "value" && s.valueId && s.valueId > 0) {
      picked.push({ attributeId: r.attributeId, attributeValueId: s.valueId });
    } else if (s.mode === "custom" && s.custom.trim()) {
      picked.push({ attributeId: r.attributeId, customAttributeValue: s.custom.trim() });
    }
  }
  return JSON.stringify([...extra, ...picked], null, 2);
}

function writeTextareaValue(json: string) {
  const ta = document.getElementById("trendyol_category_attributes");
  if (!(ta instanceof HTMLTextAreaElement)) return;
  ta.value = json;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.dispatchEvent(new Event("change", { bubbles: true }));
}

function isFilled(r: TrendyolCategoryAttributePickerRow, cur: SelEntry): boolean {
  if (cur.mode === "value") return cur.valueId > 0;
  if (cur.mode === "custom") return cur.custom.trim().length > 0;
  return false;
}

function isLikelyTechnical(row: TrendyolCategoryAttributePickerRow): boolean {
  if (row.required) return false;
  return TECHNICAL_NAME_HINT.test(row.name);
}

function fieldDomId(attributeId: number) {
  return `ty-attr-${attributeId}`;
}

const fieldShell =
  "rounded-lg border border-stone-200/55 bg-white/95 px-3 py-2.5 shadow-[0_1px_2px_rgba(28,25,23,0.03)] transition-[box-shadow,background-color,border-color] duration-200";

const fieldShellRequired = "border-amber-200/70 bg-amber-50/15 ring-1 ring-amber-100/80";

const inputBase =
  "mt-1.5 w-full rounded-lg border border-stone-200/80 bg-white px-2.5 py-2 text-[12px] text-stone-800 shadow-inner shadow-stone-900/[0.02] outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-300/35";

function SearchableValueSelect({
  row,
  selectVal,
  controlId,
  onPick,
}: {
  row: TrendyolCategoryAttributePickerRow;
  selectVal: string;
  controlId: string;
  onPick: (valueId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr-TR");
    if (!t) return row.values;
    return row.values.filter((o) => o.name.toLocaleLowerCase("tr-TR").includes(t));
  }, [q, row.values]);

  const selectedLabel = useMemo(() => {
    if (!selectVal) return "";
    const id = Number(selectVal);
    return row.values.find((v) => v.id === id)?.name ?? "";
  }, [row.values, selectVal]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (rootRef.current && t instanceof Node && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1.5 max-w-full sm:max-w-none">
      <button
        type="button"
        id={controlId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          inputBase,
          "flex w-full cursor-pointer items-center justify-between gap-2 text-left font-normal",
          !selectVal && "text-stone-400",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate">{selectVal ? selectedLabel : row.required ? "Seçin…" : "— Boş —"}</span>
        <span className="shrink-0 text-[10px] text-stone-400" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-lg border border-stone-200/90 bg-white shadow-lg shadow-stone-900/10 ring-1 ring-stone-900/[0.04]"
          role="listbox"
        >
          <div className="border-b border-stone-100/90 p-2">
            <input
              type="search"
              autoComplete="off"
              placeholder="Ara…"
              className="w-full rounded-md border border-stone-200/80 bg-stone-50/80 px-2 py-1.5 text-[11px] outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-300/50"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                className="w-full px-2.5 py-1.5 text-left text-[11px] text-stone-500 hover:bg-stone-50"
                onClick={() => {
                  onPick(null);
                  setQ("");
                  setOpen(false);
                }}
              >
                {row.required ? "Seçimi temizle" : "— Boş —"}
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectVal === String(opt.id)}
                  className={cn(
                    "w-full px-2.5 py-1.5 text-left text-[11px] text-stone-800 hover:bg-stone-50",
                    selectVal === String(opt.id) && "bg-stone-100/90 font-medium",
                  )}
                  onClick={() => {
                    onPick(opt.id);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  {opt.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-2.5 py-3 text-center text-[10px] text-stone-400">Sonuç yok</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AttributeField({
  r,
  cur,
  setEntry,
}: {
  r: TrendyolCategoryAttributePickerRow;
  cur: SelEntry;
  setEntry: (attributeId: number, next: SelEntry) => void;
}) {
  const selectVal = cur.mode === "value" ? String(cur.valueId) : "";
  const showSearchable = r.values.length > 7;

  return (
    <div id={fieldDomId(r.attributeId)} className={cn(fieldShell, r.required && fieldShellRequired)}>
      <div className="flex items-start justify-between gap-2">
        <label className="block min-w-0 flex-1 text-[11px] font-medium leading-snug text-stone-800" htmlFor={`${fieldDomId(r.attributeId)}-control`}>
          {r.name}
          {r.required ? <span className="ml-0.5 font-semibold text-amber-800/90">*</span> : null}
        </label>
        <span className="shrink-0 rounded bg-stone-100/90 px-1.5 py-0.5 font-mono text-[9px] text-stone-400" title="Trendyol attributeId">
          {r.attributeId}
        </span>
      </div>
      {r.values.length > 0 ? (
        showSearchable ? (
          <SearchableValueSelect
            row={r}
            selectVal={selectVal}
            controlId={`${fieldDomId(r.attributeId)}-control`}
            onPick={(id) => {
              if (id == null) setEntry(r.attributeId, { mode: "none" });
              else setEntry(r.attributeId, { mode: "value", valueId: id });
            }}
          />
        ) : (
          <select
            id={`${fieldDomId(r.attributeId)}-control`}
            className={cn(inputBase, "cursor-pointer appearance-none bg-[length:10px] bg-[right_10px_center] bg-no-repeat pr-8")}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2378716a' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,
            }}
            value={selectVal}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) setEntry(r.attributeId, { mode: "none" });
              else setEntry(r.attributeId, { mode: "value", valueId: Number(v) });
            }}
          >
            <option value="">{r.required ? "Seçin…" : "— Boş —"}</option>
            {r.values.map((opt) => (
              <option key={opt.id} value={String(opt.id)}>
                {opt.name}
              </option>
            ))}
          </select>
        )
      ) : (
        <input
          id={`${fieldDomId(r.attributeId)}-control`}
          type="text"
          className={inputBase}
          placeholder="Değer yazın"
          value={cur.mode === "custom" ? cur.custom : ""}
          onChange={(e) => {
            const t = e.target.value;
            if (!t.trim()) setEntry(r.attributeId, { mode: "none" });
            else setEntry(r.attributeId, { mode: "custom", custom: t });
          }}
        />
      )}
    </div>
  );
}

function AttributeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5">{children}</div>;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">{title}</h3>
      {hint ? <span className="text-[10px] text-stone-400">{hint}</span> : null}
    </div>
  );
}

type TrendyolCategoryAttributesPickerProps = {
  initialRows: TrendyolCategoryAttributePickerRow[];
  initialProductAttributes: unknown;
};

export function TrendyolCategoryAttributesPicker({
  initialRows,
  initialProductAttributes,
}: TrendyolCategoryAttributesPickerProps) {
  const baseAttrs = useMemo(() => parseProductAttrs(initialProductAttributes), [initialProductAttributes]);
  const [rows, setRows] = useState<TrendyolCategoryAttributePickerRow[]>(initialRows);
  const [sel, setSel] = useState<SelMap>(() => buildInitialSelection(initialRows, baseAttrs));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    setRows(initialRows);
    setSel(buildInitialSelection(initialRows, baseAttrs));
  }, [initialRows, baseAttrs]);

  const syncToTextarea = useCallback((nextRows: TrendyolCategoryAttributePickerRow[], nextSel: SelMap) => {
    if (nextRows.length === 0) return;
    const extra = extrasNotManagedByRows(readParsedAttrsFromTextarea(), nextRows);
    writeTextareaValue(buildJsonPayload(nextRows, nextSel, extra));
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    syncToTextarea(rows, sel);
  }, [rows, sel, syncToTextarea]);

  const { requiredRows, optionalRows, technicalRows } = useMemo(() => {
    const req: TrendyolCategoryAttributePickerRow[] = [];
    const opt: TrendyolCategoryAttributePickerRow[] = [];
    const tech: TrendyolCategoryAttributePickerRow[] = [];
    for (const r of rows) {
      if (r.required) req.push(r);
      else if (isLikelyTechnical(r)) tech.push(r);
      else opt.push(r);
    }
    const byName = (a: TrendyolCategoryAttributePickerRow, b: TrendyolCategoryAttributePickerRow) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
    req.sort(byName);
    opt.sort(byName);
    tech.sort(byName);
    return { requiredRows: req, optionalRows: opt, technicalRows: tech };
  }, [rows]);

  const missingRequired = useMemo(() => {
    return requiredRows.filter((r) => {
      const cur = sel.get(r.attributeId) ?? { mode: "none" as const };
      return !isFilled(r, cur);
    });
  }, [requiredRows, sel]);

  const filledCount = useMemo(() => rows.filter((r) => isFilled(r, sel.get(r.attributeId) ?? { mode: "none" })).length, [rows, sel]);

  const loadFromCategoryId = () => {
    setLoadError(null);
    const el = document.getElementById("trendyol_category_id");
    const raw = el instanceof HTMLInputElement ? el.value.trim() : "";
    if (!/^\d+$/.test(raw)) {
      setLoadError("Önce «Kategori ID» alanına yalnızca rakamlardan oluşan Trendyol kategori numarasını yazın.");
      return;
    }
    startTransition(async () => {
      const res = await loadTrendyolCategoryAttributePickerRowsAction(raw);
      if (!res.ok) {
        setLoadError(res.message);
        return;
      }
      if (res.rows.length === 0) {
        setLoadError(
          "Bu kategori için özellik listesi boş döndü (Trendyol yanıtı). Kategori ID’sini veya entegrasyon ortamını kontrol edin.",
        );
      } else {
        setLoadError(null);
      }
      const parsedNow = readParsedAttrsFromTextarea();
      setRows(res.rows);
      setSel(buildInitialSelection(res.rows, parsedNow));
    });
  };

  const setEntry = (attributeId: number, next: SelEntry) => {
    setSel((prev) => {
      const n = new Map(prev);
      n.set(attributeId, next);
      return n;
    });
  };

  const scrollToField = (attributeId: number) => {
    const el = document.getElementById(fieldDomId(attributeId));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el?.querySelector<HTMLElement>("select, input, button");
    focusable?.focus({ preventScroll: true });
  };

  const skeletonBlock = (
    <div className="animate-pulse space-y-2.5" aria-hidden>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-[72px] rounded-lg bg-stone-100/80" />
      ))}
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200/60 bg-gradient-to-b from-stone-50/90 to-white p-3 shadow-sm">
        <p className="text-[11px] leading-relaxed text-stone-600">
          Bu kategori için henüz özellik şeması yüklenmemiş. Listeyi Trendyol&apos;dan çekin; seçimler JSON alanını otomatik günceller.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={loadFromCategoryId} disabled={pending} className={cn(adminSecondaryButton, "px-3 py-1.5 text-[11px]")}>
            {pending ? "Yükleniyor…" : "Özellik listesini yükle"}
          </button>
        </div>
        {pending ? <div className="mt-3 min-h-[200px]">{skeletonBlock}</div> : null}
        {loadError ? <p className="mt-2 text-[10px] text-amber-900/85">{loadError}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-stone-200/60 bg-gradient-to-b from-stone-50/80 to-white p-3 shadow-sm sm:p-4",
        "motion-safe:transition-[opacity,box-shadow] motion-safe:duration-200",
        pending && "opacity-[0.97]",
      )}
    >
      {pending ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 bg-stone-200/70" aria-hidden>
          <div className="h-full w-full origin-left animate-pulse bg-stone-400/45" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100/90 pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-700">
            <span className="inline-flex items-center gap-1">
              <span className="text-emerald-600" aria-hidden>
                ✓
              </span>
              <span className="font-medium tabular-nums">{rows.length}</span>
              <span className="text-stone-500">özellik yüklendi</span>
            </span>
            {missingRequired.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-900/90">
                <span aria-hidden>⚠</span>
                <span className="font-medium tabular-nums">{missingRequired.length}</span>
                <span className="text-stone-600">zorunlu eksik</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-stone-500">
                <span className="text-emerald-600/80" aria-hidden>
                  ✓
                </span>
                Zorunlular tamam
              </span>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-stone-500">
            <span className="font-medium text-stone-600 tabular-nums">{filledCount}</span> / {rows.length} alan
            dolduruldu · JSON otomatik güncellenir.
          </p>
        </div>
        <button type="button" onClick={loadFromCategoryId} disabled={pending} className={cn(adminSecondaryButton, "shrink-0 px-3 py-1.5 text-[10px]")}>
          {pending ? "…" : "Listeyi yenile"}
        </button>
      </div>

      {missingRequired.length > 0 ? (
        <div className="sticky top-2 z-20 mt-3 rounded-lg border border-amber-200/55 bg-amber-50/40 px-3 py-2 shadow-sm backdrop-blur-[2px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-950/80">Eksik Trendyol bilgileri</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {missingRequired.map((r) => (
              <li key={r.attributeId}>
                <button
                  type="button"
                  className="rounded-full border border-amber-200/70 bg-white/90 px-2 py-0.5 text-left text-[10px] font-medium text-amber-950/90 transition hover:bg-amber-50/90"
                  onClick={() => scrollToField(r.attributeId)}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loadError ? <p className="mt-2 text-[10px] text-amber-900/85">{loadError}</p> : null}

      <div className={cn("mt-3 space-y-4", pending && "pointer-events-none min-h-[120px]")}>
        <section className="rounded-lg border border-stone-100/90 bg-white/40 p-2.5 sm:p-3">
          <SectionTitle title="Zorunlu özellikler" hint="Önce bunları doldurun" />
          <AttributeGrid>
            {requiredRows.map((r) => (
              <AttributeField key={r.attributeId} r={r} cur={sel.get(r.attributeId) ?? { mode: "none" }} setEntry={setEntry} />
            ))}
          </AttributeGrid>
          {requiredRows.length === 0 ? <p className="text-[10px] text-stone-400">Bu kategoride zorunlu özellik yok.</p> : null}
        </section>

        {optionalRows.length > 0 ? (
          <details className="group rounded-lg border border-stone-200/50 bg-white/50 open:bg-white/80 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-50/80 [&::-webkit-details-marker]:hidden">
              <span>
                İsteğe bağlı özellikler
                <span className="ml-1.5 font-normal text-stone-400 tabular-nums">({optionalRows.length})</span>
              </span>
              <span className="text-[10px] text-stone-400 group-open:rotate-180 motion-safe:transition">▼</span>
            </summary>
            <div className="border-t border-stone-100/90 p-2.5 pt-3 sm:p-3">
              <AttributeGrid>
                {optionalRows.map((r) => (
                  <AttributeField key={r.attributeId} r={r} cur={sel.get(r.attributeId) ?? { mode: "none" }} setEntry={setEntry} />
                ))}
              </AttributeGrid>
            </div>
          </details>
        ) : null}

        {technicalRows.length > 0 ? (
          <details className="group rounded-lg border border-stone-200/50 bg-white/50 open:bg-white/80 open:shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-stone-700 transition hover:bg-stone-50/80 [&::-webkit-details-marker]:hidden">
              <span>
                Teknik detaylar
                <span className="ml-1.5 font-normal text-stone-400 tabular-nums">({technicalRows.length})</span>
              </span>
              <span className="text-[10px] text-stone-400 group-open:rotate-180 motion-safe:transition">▼</span>
            </summary>
            <div className="border-t border-stone-100/90 p-2.5 pt-3 sm:p-3">
              <p className="mb-2 text-[10px] leading-relaxed text-stone-500">
                İsim kalıbına göre gruplanır; API aynıdır. Gerekirse açıp doldurun.
              </p>
              <AttributeGrid>
                {technicalRows.map((r) => (
                  <AttributeField key={r.attributeId} r={r} cur={sel.get(r.attributeId) ?? { mode: "none" }} setEntry={setEntry} />
                ))}
              </AttributeGrid>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
