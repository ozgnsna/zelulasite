/** Sepet ve checkout’ta ücretsiz kargo için ara toplam eşiği (TRY). */
export const FREE_SHIPPING_THRESHOLD_TRY = 350;

/** 350₺ altı fiziksel siparişlerde uygulanan sabit kargo ücreti (TRY). */
export const STANDARD_SHIPPING_FEE_TRY = 149.9;

export function computeShippingFeeTry(
  subtotal: number,
  options?: { hasPhysicalItems?: boolean },
): number {
  if (options?.hasPhysicalItems === false) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD_TRY) return 0;
  return STANDARD_SHIPPING_FEE_TRY;
}
