'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Zap, Shield, Code, CheckCircle2, Percent } from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  price: number;
  credits: number;
  features?: string;
  discountPercentage?: number;
  discountLabel?: string;
  active: boolean;
}

const iconMap: Record<number, any> = {
  0: Zap,
  1: Shield,
  2: MessageSquare,
};

const colorMap: Record<number, string> = {
  0: 'blue',
  1: 'purple',
  2: 'orange',
};

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data) => {
        console.log('PricingSection - Raw data from API:', data);
        // Convert paise to rupees (database stores in paise)
        const plansWithRupees = data.map((plan: Plan) => ({
          ...plan,
          price: Math.round(plan.price / 100)
        }));
        console.log('PricingSection - After conversion:', plansWithRupees);
        setPlans(plansWithRupees);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load pricing:', error);
        setLoading(false);
      });
  }, [])

  if (loading) {
    return (
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-xl text-gray-400">Pay only for what you use with our flexible credit system</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="container mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
        <p className="text-xl text-gray-400">Pay only for what you use with our flexible credit system</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => {
          const Icon = iconMap[index % 3] || Zap;
          const color = colorMap[index % 3] || 'blue';
          const isPopular = plan.discountLabel && plan.discountLabel.toLowerCase().includes('popular');
          const originalPrice = plan.discountPercentage && plan.discountPercentage > 0
            ? Math.round(plan.price / (1 - plan.discountPercentage / 100))
            : null;

          return (
            <div
              key={plan.id}
              className={`backdrop-blur-sm p-8 rounded-xl transition relative ${
                isPopular
                  ? 'bg-gradient-to-b from-purple-900/50 to-gray-800/50 border-2 border-purple-500/50 hover:border-purple-500'
                  : `bg-gray-800/50 border border-gray-700/50 hover:border-${color}-500/50`
              }`}
            >
              {plan.discountLabel && (
                <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 ${
                  isPopular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                } text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5`}>
                  {plan.discountPercentage && plan.discountPercentage > 0 && (
                    <Percent className="w-3 h-3" />
                  )}
                  {plan.discountLabel}
                </div>
              )}
              <div className={`text-${color}-500 mb-4`}>
                <Icon className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                {originalPrice && (
                  <div className="text-2xl text-gray-500 line-through mb-1">
                    ₹{originalPrice}
                  </div>
                )}
                <div className="text-4xl font-bold flex items-baseline gap-2">
                  ₹{plan.price}
                  {plan.discountPercentage && plan.discountPercentage > 0 && (
                    <span className="text-lg text-yellow-400 font-semibold">
                      Save {plan.discountPercentage}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-400 mb-6">{plan.credits.toLocaleString()} Credits</p>
              <ul className="space-y-3 mb-8">
                {plan.features ? (
                  // Display features from database
                  plan.features.split('\n').filter(f => f.trim()).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-300">{feature.trim()}</span>
                    </li>
                  ))
                ) : (
                  // Fallback features if none specified
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">{plan.credits.toLocaleString()} message credits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">Full API access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-gray-300">Email support</span>
                    </li>
                  </>
                )}
              </ul>
              <Link
                href="/signup"
                className={`block w-full text-center font-semibold py-3 rounded-lg transition ${
                  isPopular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Get Started
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
