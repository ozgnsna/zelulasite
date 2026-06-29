const html = await (await fetch("https://www.zeluladesign.com/")).text();

const heroWebp = html.includes("/hero-banner-baligin-isiltisi.webp");
const heroPng = html.includes("/hero-banner-baligin-isiltisi.png");
const nextHero = [...html.matchAll(/\/_next\/image\?url=%2Fhero-banner[^"'\s&]+/g)].map((m) =>
  decodeURIComponent(m[0].replace("/_next/image?url=", "")),
);
console.log("Uses .webp in HTML:", heroWebp);
console.log("Uses .png in HTML:", heroPng);
console.log("Unique hero paths via _next/image:", [...new Set(nextHero)]);

const src3840 = html.includes("hero-banner-baligin-isiltisi.webp&amp;w=3840");
const preload = html.includes('rel="preload" as="image"');
console.log("LCP img src fallback w=3840:", src3840);
console.log("Has image preload link:", preload);

const imgs = [...html.matchAll(/<img[^>]+>/g)].map((m) => m[0]);
console.log("Total <img> tags:", imgs.length);
console.log("Hero img tags:", imgs.filter((t) => t.includes("hero-banner")).length);

const urls = [
  "https://www.zeluladesign.com/_next/image?url=%2Fhero-banner-baligin-isiltisi.webp&w=828&q=75",
  "https://www.zeluladesign.com/_next/image?url=%2Fhero-banner-gold.webp&w=828&q=75",
  "https://www.zeluladesign.com/_next/image?url=%2Fhero-banner-pearl.webp&w=828&q=75",
  "https://www.zeluladesign.com/_next/image?url=%2Fhero-banner-collection.webp&w=828&q=75",
];

let total = 0;
for (const url of urls) {
  const res = await fetch(url, { headers: { Accept: "image/avif,image/webp,*/*" } });
  const buf = await res.arrayBuffer();
  total += buf.byteLength;
  console.log(`${res.status} ${res.headers.get("content-type")} ${buf.byteLength}B ${url.split("banner-")[1]?.slice(0, 30)}`);
}
console.log("All 4 heroes @828w AVIF total:", total, "bytes (~" + Math.round(total / 1024) + " KiB)");
