'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const pricingPlans = [
    {
      id: 1,
      name: 'Starter',
      credits: 100,
      price: 10,
      icon: Zap,
      color: 'from-blue-500 to-cyan-600',
      popular: false,
      features: [
        '100 Message Credits',
        'WhatsApp Integration',
        'API Access',
        'Basic Support',
        'Contact Management',
      ],
    },
    {
      id: 2,
      name: 'Professional',
      credits: 500,
      price: 40,
      icon: Star,
      color: 'from-purple-500 to-pink-600',
      popular: true,
      features: [
        '500 Message Credits',
        'WhatsApp Integration',
        'API Access',
        'Priority Support',
        'Contact Management',
        'Bulk Messaging',
        'Excel Import',
      ],
    },
    {
      id: 3,
      name: 'Enterprise',
      credits: 2000,
      price: 120,
      icon: Crown,
      color: 'from-orange-500 to-red-600',
      popular: false,
      features: [
        '2000 Message Credits',
        'WhatsApp Integration',
        'API Access',
        '24/7 Priority Support',
        'Contact Management',
        'Bulk Messaging',
        'Excel Import',
        'Custom Integrations',
        'Dedicated Account Manager',
      ],
    },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border ${
                  plan.popular ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-gray-700/50'
                } overflow-hidden transition-all hover:scale-105`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-1 rounded-bl-lg text-sm font-bold">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center mb-6`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  
                  {/* Credits */}
                  <p className="text-gray-400 mb-6">{plan.credits} Message Credits</p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-400 ml-2">one-time</span>
                  </div>

                  {/* Purchase Button */}
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    className={`w-full py-3 rounded-lg font-bold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-all mb-6`}
                  >
                    Get Started
                  </button>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

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
