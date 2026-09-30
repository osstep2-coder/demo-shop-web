/** The seed promo codes from api/server/db.py. */
import type { Promo } from "../types";

export const promos = {
  WELCOME10: { code: "WELCOME10", type: "percent", value: 10, minOrderTotal: 100000, expiresAt: "2027-09-30", maxUsesPerUser: 1, isActive: true },
  SALE15: { code: "SALE15", type: "percent", value: 15, minOrderTotal: 0, expiresAt: "2027-09-30", maxUsesPerUser: 3, isActive: true },
  MINUS500: { code: "MINUS500", type: "fixed", value: 50000, minOrderTotal: 300000, expiresAt: "2027-09-30", maxUsesPerUser: 1, isActive: true },
  EXPIRED20: { code: "EXPIRED20", type: "percent", value: 20, minOrderTotal: 0, expiresAt: "2026-09-29", maxUsesPerUser: 1, isActive: true },
} satisfies Record<string, Promo>;

export type PromoCode = keyof typeof promos;
