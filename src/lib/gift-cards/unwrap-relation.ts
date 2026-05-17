/** Supabase nested select bazen tekil obje bazen dizi döner. */
export function unwrapSupabaseRelation<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}
