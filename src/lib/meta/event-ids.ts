/** Pixel + CAPI ortak event_id — Purchase için iki taraf aynı değeri kullanır. */

export function metaPageViewEventId(path: string): string {
  return `pageview:${path.trim() || "/"}`;
}

export function metaViewContentEventId(productId: string): string {
  return `viewcontent:${productId.trim()}`;
}

export function metaAddToCartEventId(productId: string): string {
  return `addtocart:${productId.trim()}:${Date.now()}`;
}

export function metaInitiateCheckoutEventId(
  items: Array<{ product_id: string; quantity: number }>,
): string {
  const key = items.map((i) => `${i.product_id}:${i.quantity}`).join("|");
  return `initiatecheckout:${key}`;
}

export function metaPurchaseEventId(orderNumber: string): string {
  return `purchase:${orderNumber.trim()}`;
}
