export type GiftCardDenomination = {
  id: string;
  amount: number;
  currency: string;
  label: string;
  slug: string;
  sortOrder: number;
  imageUrl: string | null;
  productId: string | null;
  productPrice: number | null;
  productSlug: string | null;
  isConfigured: boolean;
};

export type GiftCardCartMeta = {
  denominationId: string;
  recipientEmail: string;
  recipientName: string | null;
  personalMessage: string | null;
};
