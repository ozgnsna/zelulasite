/**
 * node scripts/test-legacy-product-redirect.mjs
 */

import assert from "node:assert/strict";
import {
  RESERVED_ROOT_SEGMENTS,
  parseLegacyProductSlugCandidate,
} from "../src/lib/seo/legacy-product-redirect.ts";

assert.equal(parseLegacyProductSlugCandidate("/giris"), null);
assert.equal(parseLegacyProductSlugCandidate("/sepet"), null);
assert.equal(parseLegacyProductSlugCandidate("/admin"), null);
assert.equal(parseLegacyProductSlugCandidate("/api/feed/google"), null);
assert.equal(parseLegacyProductSlugCandidate("/urunler/foo"), null);
assert.equal(parseLegacyProductSlugCandidate("/kategori/kupe"), null);
assert.equal(parseLegacyProductSlugCandidate("/"), null);
assert.equal(
  parseLegacyProductSlugCandidate("/holiday-sock-bros-yilbasi-ozel-koleksiyon"),
  "holiday-sock-bros-yilbasi-ozel-koleksiyon",
);

for (const segment of RESERVED_ROOT_SEGMENTS) {
  assert.equal(parseLegacyProductSlugCandidate(`/${segment}`), null, `reserved: ${segment}`);
}

console.log("legacy-product-redirect unit checks: OK");
