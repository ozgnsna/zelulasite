export function loyaltyEarnOrderDescription(orderId: string) {
  return `EARN_ORDER:${orderId}`;
}

export function loyaltyClawbackEarnDescription(orderId: string) {
  return `CLAWBACK_EARN:${orderId}`;
}

export function loyaltyRedeemOrderDescription(orderId: string) {
  return `REDEEM_ORDER:${orderId}`;
}

export function loyaltyRedeemReleaseDescription(orderId: string) {
  return `REDEEM_RELEASE:${orderId}`;
}

export function loyaltyReferralEarnDescription(orderId: string) {
  return `REFERRAL_EARN:${orderId}`;
}

export function loyaltyReferralReversalDescription(orderId: string) {
  return `REFERRAL_REVERSED:${orderId}`;
}

export function loyaltyFirstReferralShareDescription(userId: string) {
  return `FIRST_REFERRAL_SHARE:${userId}`;
}

export function loyaltyReferralFriendBonusDescription(orderId: string) {
  return `REFERRAL_FRIEND_BONUS:${orderId}`;
}

export function loyaltyReferralFriendBonusReversalDescription(orderId: string) {
  return `REFERRAL_FRIEND_REVERSED:${orderId}`;
}
