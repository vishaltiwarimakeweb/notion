const MEMBER_LIMITS = {
  free: 2,
  pro: 20,
  enterprise: Infinity,
} as const;

export function getMemberLimit(plan: keyof typeof MEMBER_LIMITS): number {
  return MEMBER_LIMITS[plan];
}
