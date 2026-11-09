'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
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

const gradientMap: Record<number, string> = {
  0: 'from-blue-500 to-cyan-500',
  1: 'from-emerald-500 to-teal-500',
  2: 'from-purple-500 to-pink-500',
};

export default function PricingPage() {
  const [user, setUser] = useState<any>(null);
  const [pricingPlans, setPricingPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = sessionStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }

    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPricingPlans(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load pricing:', error);
        setLoading(false);
      });
  }, []);

  const handlePurchase = async (planId: number) => {
    if (!user) {
      window.location.href = `/signin?redirect=/pricing`;
      return;
    }

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userId: user.id }),
      });

      const data = await response.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(data.message || 'Payment initiated. Please check your billing dashboard.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/signin" className="text-sm font-medium text-gray-300 hover:text-white transition">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Flexible Pay-Per-Message Credits
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Predictable, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-400">
            Recharge your account with credits that never expire. Pay only for what you send.
          </p>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-64 mb-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-stretch">
            {pricingPlans.map((plan, index) => {
              const Icon = iconMap[index % 3] || Zap;
              const gradient = gradientMap[index % 3] || 'from-emerald-500 to-teal-500';
              const isPopular = plan.discountLabel?.toLowerCase().includes('popular') || index === 1;
              const features = plan.features 
                ? plan.features.split('\n').filter((f) => f.trim())
                : [`${plan.credits} Message Credits`, 'WhatsApp Web Integration', 'REST API Access', 'Basic Analytics'];

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl bg-gray-900/60 backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 ${
                    isPopular 
                      ? 'border-emerald-500/60 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/30' 
                      : 'border-gray-800 shadow-xl'
                  }`}
                >
                  {/* Badge */}
                  {plan.discountLabel && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                      {plan.discountLabel}
                    </div>
                  )}

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {plan.discountPercentage ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {plan.discountPercentage}% OFF
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      {plan.credits.toLocaleString()} Message Credits
                    </p>

                    <div className="mb-6 flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                        ₹{plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">one-time</span>
                    </div>

                    <button
                      onClick={() => handlePurchase(plan.id)}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-lg mb-8 ${
                        isPopular
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20'
                          : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      {user ? 'Recharge Credits' : 'Get Started'}
                    </button>

                    <div className="space-y-3.5 pt-6 border-t border-gray-800/80 flex-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What's included</p>
                      {features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300 leading-snug">{feature.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ Section */}
        <div className="rounded-2xl bg-gray-900/60 backdrop-blur-md border border-gray-800 p-8 md:p-10 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-base font-semibold text-white mb-2">What is a message credit?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Each WhatsApp message you send (text or file attachment) deducts 1 credit. Credits stack and never expire.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">Can I buy multiple plans?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Yes, you can purchase any credit pack as often as needed. All credits automatically accumulate in your account balance.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">Are incoming messages free?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Yes! Receiving incoming messages, Webhook deliveries, and reading chat logs are completely free of charge.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white mb-2">What payment methods are supported?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We accept UPI, Net Banking, Credit/Debit Cards, and Wallets through Razorpay and PhonePe.
              </p>
            </div>
          </div>
        </div>

        {/* Custom CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Looking for Custom Volume or Enterprise Setup?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm md:text-base mb-6">
            We offer dedicated high-concurrency instances, bespoke webhooks, and volume pricing for teams sending 50,000+ messages/month.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Go to Workspace
            </Link>
            <a
              href="mailto:hello@codefy.tech"
              className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold text-sm transition"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
