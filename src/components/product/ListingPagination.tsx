import Link from "next/link";
import {
  buildListingPageHref,
  type ListingSearchParams,
} from "@/lib/storefront/listing-pagination";

export function ListingPagination({
  path,
  current,
  page,
  totalPages,
  totalCount,
}: {
  path: string;
  current: ListingSearchParams;
  page: number;
  totalPages: number;
  totalCount: number;
}) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? buildListingPageHref(path, current, page - 1) : null;
  const next = page < totalPages ? buildListingPageHref(path, current, page + 1) : null;

  // Compact window around current page
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-3 border-t border-stone-200 pt-8"
      aria-label="Sayfalama"
    >
      <p className="text-xs text-stone-500">
        {totalCount} ürün · Sayfa {page} / {totalPages}
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {prev ? (
            <Link
              href={prev}
              className="inline-flex min-h-9 items-center rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 transition hover:border-stone-400"
            >
              Önceki
            </Link>
          ) : (
            <span className="inline-flex min-h-9 items-center rounded-full border border-transparent px-3 text-sm text-stone-300">
              Önceki
            </span>
          )}
        </li>
        {start > 1 ? (
          <>
            <li>
              <Link
                href={buildListingPageHref(path, current, 1)}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-sm text-stone-700 hover:border-stone-400"
              >
                1
              </Link>
            </li>
            {start > 2 ? (
              <li className="px-1 text-sm text-stone-400" aria-hidden>
                …
              </li>
            ) : null}
          </>
        ) : null}
        {pages.map((p) => (
          <li key={p}>
            {p === page ? (
              <span
                aria-current="page"
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white"
              >
                {p}
              </span>
            ) : (
              <Link
                href={buildListingPageHref(path, current, p)}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-sm text-stone-700 hover:border-stone-400"
              >
                {p}
              </Link>
            )}
          </li>
        ))}
        {end < totalPages ? (
          <>
            {end < totalPages - 1 ? (
              <li className="px-1 text-sm text-stone-400" aria-hidden>
                …
              </li>
            ) : null}
            <li>
              <Link
                href={buildListingPageHref(path, current, totalPages)}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-sm text-stone-700 hover:border-stone-400"
              >
                {totalPages}
              </Link>
            </li>
          </>
        ) : null}
        <li>
          {next ? (
            <Link
              href={next}
              className="inline-flex min-h-9 items-center rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 transition hover:border-stone-400"
            >
              Sonraki
            </Link>
          ) : (
            <span className="inline-flex min-h-9 items-center rounded-full border border-transparent px-3 text-sm text-stone-300">
              Sonraki
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
