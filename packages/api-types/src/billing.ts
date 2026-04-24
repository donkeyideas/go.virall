import { z } from 'zod';
import { SubscriptionTierEnum } from './common';

export const CreateCheckoutInput = z.object({
  tier: SubscriptionTierEnum.exclude(['free']),
  interval: z.enum(['month', 'year']).default('month'),
});

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutInput>;
