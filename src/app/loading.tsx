export default function Loading() {
  return (
    <main className="container-premium py-12">
      <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-stone-200 bg-white p-4">
            <div className="aspect-[4/5] animate-pulse rounded-xl bg-stone-200" />
            <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-stone-200" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
