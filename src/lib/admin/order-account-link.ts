import { canWriteProductReview } from "@/lib/account/reviews";

export type AdminOrderAccountLink = {
  mode: "linked" | "guest";
  userId: string | null;
  accountEmail: string | null;
  accountName: string | null;
  canWriteReviews: boolean;
  reviewStatusLabel: string;
  reviewDetail: string;
};

export function buildAdminOrderAccountLink(input: {
  userId: string | null | undefined;
  paymentStatus: string;
  orderStatus: string;
  accountEmail?: string | null;
  accountName?: string | null;
}): AdminOrderAccountLink {
  const userId = String(input.userId ?? "").trim() || null;

  if (!userId) {
    return {
      mode: "guest",
      userId: null,
      accountEmail: null,
      accountName: null,
      canWriteReviews: false,
      reviewStatusLabel: "Yorum kapalı",
      reviewDetail:
        "Misafir checkout — sipariş hesaba bağlı değil. Aynı e-postayla kayıtlı hesap olsa bile müşteri yorum yazamaz.",
    };
  }

  const accountEmail = String(input.accountEmail ?? "").trim() || null;
  const accountName = String(input.accountName ?? "").trim() || null;

  if (!canWriteProductReview(input.paymentStatus, input.orderStatus)) {
    const pay = String(input.paymentStatus ?? "");
    const os = String(input.orderStatus ?? "");
    let detail = "Ödeme ve teslim tamamlanınca yorum açılır.";
    if (pay !== "paid") detail = "Ödeme tamamlanmadan yorum açılmaz.";
    else if (os !== "hand_delivered") detail = "Sipariş teslim edilince (elden veya kargo) yorum açılır.";

    return {
      mode: "linked",
      userId,
      accountEmail,
      accountName,
      canWriteReviews: false,
      reviewStatusLabel: "Yorum henüz açık değil",
      reviewDetail: detail,
    };
  }

  return {
    mode: "linked",
    userId,
    accountEmail,
    accountName,
    canWriteReviews: true,
    reviewStatusLabel: "Yorum yazabilir",
    reviewDetail:
      "Müşteri hesabından veya ürün sayfasından yorum bırakabilir. Yorum admin onayından sonra sitede görünür.",
  };
}
