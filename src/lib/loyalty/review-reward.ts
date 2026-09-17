/** Yorum onayı → Zelula Puan */
export const ZELULA_PUAN_PER_APPROVED_REVIEW = 25;

export function loyaltyReviewEarnDescription(reviewId: string) {
  return `review:${reviewId}`;
}
