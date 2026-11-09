import 'dotenv/config';
import { db } from '../lib/db';
import { plans } from '../db/schema';
import { count } from 'drizzle-orm';

async function seedPlans() {
  const [c] = await db.select({ total: count() }).from(plans);
  if (c.total === 0) {
    await db.insert(plans).values([
      {
        name: 'Starter',
        price: 499,
        credits: 500,
        features: '500 Message Credits\nWhatsApp QR Integration\nREST API Access\nContact Management\nCommunity Support',
        discountPercentage: 0,
        discountLabel: null,
        active: true,
      },
      {
        name: 'Professional',
        price: 1499,
        credits: 2000,
        features: '2,000 Message Credits\nHigh-Speed Sending\nBulk Excel Contact Import\nFull API & Webhooks Access\nChat Inbox Interface\nPriority Support',
        discountPercentage: 15,
        discountLabel: 'Most Popular',
        active: true,
      },
      {
        name: 'Enterprise',
        price: 4999,
        credits: 10000,
        features: '10,000 Message Credits\nUnlimited Contacts\nDedicated WhatsApp Sessions\nHigh Concurrency Limits\nReal-time Delivery Reports\n24/7 Dedicated Support',
        discountPercentage: 25,
        discountLabel: 'Best Value',
        active: true,
      },
    ]);
    console.log('✅ Successfully seeded default pricing plans!');
  } else {
    console.log('ℹ️ Plans already exist:', c.total);
  }
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error('Failed to seed plans:', err);
  process.exit(1);
});
