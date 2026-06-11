import Image from "next/image";
import { FadeIn } from "@/components/home/FadeIn";
import { InstagramFeedImage } from "@/components/home/InstagramFeedImage";
import { TrackedExternalLink } from "@/components/analytics/TrackedExternalLink";
import { getInstagramFeed } from "@/lib/instagram";

const instagramProfileHref = `https://www.instagram.com/${process.env.INSTAGRAM_USERNAME ?? "zelulaofficial"}`;

const FALLBACK_IMAGES = [
  "https://images.pexels.com/photos/1454171/pexels-photo-1454171.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/1454172/pexels-photo-1454172.jpeg?auto=compress&cs=tinysrgb&w=900",
  "https://images.pexels.com/photos/10983783/pexels-photo-10983783.jpeg?auto=compress&cs=tinysrgb&w=900",
];

export function HomeInstagramSectionSkeleton() {
  return (
    <FadeIn>
      <section className="container-premium py-12 sm:py-16" aria-hidden>
        <div className="rounded-[2rem] border border-[#e8e3da] bg-[#fdfcfa] px-6 py-10 shadow-[0_20px_48px_rgba(55,48,40,0.06)] sm:px-10 sm:py-12">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-stone-200/60" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-stone-200/50" />
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

export async function HomeInstagramSection() {
  const instagramPosts = await getInstagramFeed(4);

  return (
    <FadeIn>
      <section className="container-premium py-12 sm:py-16">
        <div className="rounded-[2rem] border border-[#e8e3da] bg-[#fdfcfa] px-6 py-10 shadow-[0_20px_48px_rgba(55,48,40,0.06)] sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-light text-stone-900">Instagram&apos;da #zelulastyle</h2>
              <p className="mt-2 text-sm font-light text-stone-600">Gerçek kombinler, gerçek Zelula ışıltısı.</p>
            </div>
            <TrackedExternalLink
              href={instagramProfileHref}
              eventType="instagram_click"
              location="home_instagram_header"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500 underline-offset-4 transition hover:text-stone-800 hover:underline"
            >
              Instagram
            </TrackedExternalLink>
          </div>
          {instagramPosts.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {instagramPosts.map((post, index) => (
                <TrackedExternalLink
                  key={post.id}
                  href={post.permalink}
                  eventType="instagram_click"
                  location="home_instagram_feed"
                  className="group overflow-hidden rounded-xl border border-[#ebe6df] shadow-sm transition duration-500 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#e0d5c8] motion-safe:hover:shadow-[0_12px_32px_rgba(55,48,40,0.08)]"
                >
                  <InstagramFeedImage
                    src={post.imageUrl}
                    alt={post.caption}
                    fallbackSrc={FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
                    className="aspect-square object-cover transition duration-[700ms] ease-out motion-safe:group-hover:scale-[1.04]"
                  />
                </TrackedExternalLink>
              ))}
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {FALLBACK_IMAGES.map((src, i) => (
                  <TrackedExternalLink
                    key={`${src}-${i}`}
                    href={instagramProfileHref}
                    eventType="instagram_click"
                    location="home_instagram_fallback_grid"
                    className="group overflow-hidden rounded-xl border border-[#ebe6df] shadow-sm transition duration-500 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#e0d5c8] motion-safe:hover:shadow-[0_12px_32px_rgba(55,48,40,0.08)]"
                  >
                    <Image
                      src={src}
                      alt="Zelula Instagram önizleme"
                      width={500}
                      height={500}
                      className="aspect-square object-cover transition duration-[700ms] ease-out motion-safe:group-hover:scale-[1.04]"
                    />
                  </TrackedExternalLink>
                ))}
              </div>
              <div className="rounded-2xl border border-dashed border-[#e0d5c8] bg-[#faf8f5]/80 px-6 py-5 text-center">
                <p className="text-sm font-light leading-relaxed text-stone-600">
                  Canlı akış kısa süreli erişilemiyor. En güncel paylaşımlar için profili ziyaret edebilirsin.
                </p>
                <TrackedExternalLink
                  href={instagramProfileHref}
                  eventType="instagram_click"
                  location="home_instagram_fallback_cta"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-stone-300/80 bg-white px-6 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-400 hover:bg-[#faf8f5]"
                >
                  Profili aç @{process.env.INSTAGRAM_USERNAME ?? "zelulaofficial"}
                </TrackedExternalLink>
              </div>
            </div>
          )}
        </div>
      </section>
    </FadeIn>
  );
}
