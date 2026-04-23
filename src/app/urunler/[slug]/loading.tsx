export default function ProductLoading() {
  return (
    <main className="container-premium py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-[4/5] animate-pulse rounded-3xl bg-stone-200" />
        <div>
          <div className="h-5 w-24 animate-pulse rounded bg-stone-200" />
          <div className="mt-3 h-10 w-2/3 animate-pulse rounded bg-stone-200" />
          <div className="mt-4 h-20 w-full animate-pulse rounded bg-stone-200" />
          <div className="mt-8 h-12 w-48 animate-pulse rounded-full bg-stone-300" />
        </div>
      </div>
    </main>
  );
}
