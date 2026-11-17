import type { Shop } from '@petsystem/contracts';

import type { Prisma } from '../../generated/prisma/client.js';

export const SHOP_SELECT = {
  id: true,
  name: true,
  isDemo: true,
  businessTypes: true,
  plan: true,
  trialEndsAt: true,
  opensAt: true,
  closesAt: true,
  slug: true,
  bookingEnabled: true,
  bookingNoticeHours: true,
  cancelNoticeHours: true,
  bookingWindowDays: true,
} satisfies Prisma.ShopSelect;

export const toShop = (s: Prisma.ShopGetPayload<{ select: typeof SHOP_SELECT }>): Shop => ({
  ...s,
  trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
});
