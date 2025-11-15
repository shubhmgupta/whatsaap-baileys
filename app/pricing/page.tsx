'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown } from 'lucide-react';
import Link from 'next/link';

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
  1: Star,
  2: Crown,
};

const colorMap: Record<number, string> = {
  0: 'from-blue-500 to-cyan-600',
  1: 'from-purple-500 to-pink-600',
  2: 'from-orange-500 to-red-600',
};

export default function PricingPage() {
  console.log('PricingPage component rendered');
  
  const [user, setUser] = useState<any>(null);
  const [pricingPlans, setPricingPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useEffect running');
    
    if (typeof window !== 'undefined') {
      const userData = sessionStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }

    // Fetch plans from API
    console.log('Fetching from /api/pricing');
    fetch('/api/pricing')
      .then((res) => {
        console.log('Response received:', res.status);
        return res.json();
      })
      .then((data) => {
        console.log('=== PRICING PAGE DATA ===');
        console.log('Full data:', JSON.stringify(data, null, 2));
        if (data && data.length > 0) {
          console.log('First plan price:', data[0].price);
          console.log('First plan price type:', typeof data[0].price);
        }
        setPricingPlans(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load pricing:', error);
        setLoading(false);
      });
  }, []);

  const handlePurchase = async (planId: number) => {
    if (!user) {
      alert('Please login to purchase credits');
      window.location.href = '/login';
      return;
    }

    // TODO: Integrate with payment gateway (Razorpay/PhonePe)
    alert('Payment integration coming soon! Contact admin for manual credit assignment.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your messaging needs. Pay only for what you use.
          </p>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64 mb-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {pricingPlans.map((plan, index) => {
              const Icon = iconMap[index % 3] || Zap;
              const color = colorMap[index % 3] || 'from-blue-500 to-cyan-600';
              const isPopular = plan.discountLabel && plan.discountLabel.toLowerCase().includes('popular');
              const features = plan.features 
                ? plan.features.split('\n').filter(f => f.trim())
                : [`${plan.credits} Message Credits`, 'WhatsApp Integration', 'API Access', 'Support'];

              return (
                <div
                  key={plan.id}
                  className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border ${
                    isPopular ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-gray-700/50'
                  } overflow-hidden transition-all hover:scale-105`}
                >
                  {/* Popular Badge */}
                  {plan.discountLabel && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-1 rounded-bl-lg text-sm font-bold">
                      {plan.discountLabel}
                    </div>
                  )}

                  <div className="p-8">
                    {/* Icon */}
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center mb-6`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    
                    {/* Credits */}
                    <p className="text-gray-400 mb-6">{plan.credits} Message Credits</p>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-white">₹{plan.price}</span>
                      <span className="text-gray-400 ml-2">one-time</span>
                      {plan.discountPercentage && plan.discountPercentage > 0 && (
                        <div className="text-yellow-400 text-sm font-semibold mt-1">
                          Save {plan.discountPercentage}%
                        </div>
                      )}
                    </div>

                    {/* Purchase Button */}
                    <button
                      onClick={() => handlePurchase(plan.id)}
                      className={`w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r ${color} hover:opacity-90 transition-all mb-6`}
                    >
                      Get Started
                    </button>

                    {/* Features */}
                    <ul className="space-y-3">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300">{feature.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">What are message credits?</h3>
              <p className="text-gray-400">
                Each WhatsApp message you send (text or file) costs 1 credit. Credits never expire and can be used anytime.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Can I upgrade or buy more credits?</h3>
              <p className="text-gray-400">
                Yes! You can purchase any plan multiple times. Credits stack and never expire.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-400">
                We accept all major credit/debit cards, UPI, and net banking through secure payment gateways.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-2">Is there a refund policy?</h3>
              <p className="text-gray-400">
                Unused credits can be refunded within 7 days of purchase. Contact support for refund requests.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need a Custom Plan?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Contact us for enterprise solutions, custom integrations, or bulk credit packages tailored to your needs.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition-colors"
            >
              Go to Dashboard
            </Link>
            <a
              href="mailto:hello@codefy.tech"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
