import { useEffect, useState, useCallback } from 'react';
import { SignInButton, useAuth } from '@clerk/clerk-react';
import { Check, Sparkles, Volume2, Lock, Star, Zap, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import StarField from '../components/StarField';
import Footer from '../components/Footer';
import { stripeAPI } from '../lib/api';
import { useDbUser } from '../context/UserContext';

const PLANS = [
  {
    name: 'Free',
    price: '£0',
    period: '',
    description: 'Perfect for trying DreamWeaver',
    credits: '3 Welcome Credits',
    cta: 'Create Your First Story Free',
    type: null, // No Stripe
    badge: null,
    color: 'border-gray-200 dark:border-white/10',
    features: [
      '3 stories on signup',
      'Photo-to-story AI',
      'Story Library',
      'Night Mode UI',
    ],
    missing: [],
  },
  {
    name: 'Premium',
    price: '£7.99',
    period: '/month',
    description: 'The full bedtime experience',
    credits: '15 credits/month',
    cta: 'Start Premium',
    type: 'subscription',
    badge: '⭐ Most Popular',
    color: 'border-dream-500',
    features: [
      '15 credits/month (auto-reset)',
      'Photo-to-story AI',
      'Story Library',
      'Night Mode UI',
    ],
    missing: [],
  },
  {
    name: 'Top-up',
    price: '£3.00',
    period: '',
    description: 'Just need a few more stories?',
    credits: '5 Credits, one-time',
    cta: 'Buy Credits',
    type: 'topup',
    badge: null,
    color: 'border-gray-200 dark:border-white/10',
    features: [
      '+5 credits, never expire',
      'Photo-to-story AI',
      'Story Library',
      'Night Mode UI',
    ],
    missing: ['Text-to-Speech', 'Private Story Vault'],
  },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(null);
  const { dbUser, refreshUser } = useDbUser();
  const [statusLoading, setStatusLoading] = useState(true);

  const handleCheckout = async (type) => {
    if (!isSignedIn) return;
    setLoading(type);
    try {
      if (type === 'manage') {
        // Already subscribed → go to billing portal
        const { url } = await stripeAPI.createPortal();
        window.location.href = url;
      } else {
        const { url } = await stripeAPI.createCheckout(type);
        window.location.href = url;
      }
    } catch {
      alert('Checkout failed. Please try again.');
      setLoading(null);
    }
  };
  const isSubscribed = dbUser?.subscription_status;


  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 badge-dream mb-6">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Simple, transparent pricing</span>
          </div>
          <h1 className="section-title text-4xl md:text-5xl mb-4">
            The right plan for every family
          </h1>
          <p className="text-gray-500 dark:text-white/50 text-lg max-w-xl mx-auto">
            Start free. Upgrade when your little one demands more stories.
          </p>
        </div>

        {/* Comparison highlight */}
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12 p-5 card border-dream-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-dream-50 dark:bg-dream-500/10 mt-0.5">
              <Volume2 className="w-4 h-4 text-dream-600 dark:text-dream-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Text-to-Speech</p>
              <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">The app reads the story aloud in a soothing voice so you can hold your child instead of your phone.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gold-50 dark:bg-gold-500/10 mt-0.5">
              <Lock className="w-4 h-4 text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Private Story Vault</p>
              <p className="text-gray-500 dark:text-white/40 text-xs mt-0.5">Your stories are locked to your account. Photos are stored privately on Cloudinary with no public access.</p>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative card border-2 ${plan.color} flex flex-col
                          ${plan.name === 'Premium' ? 'shadow-dream scale-[1.02] md:-mt-2 md:mb-2' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="badge-gold text-xs py-1.5 px-4 shadow-gold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2>
                <p className="text-gray-500 dark:text-white/50 text-sm mt-1">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-gray-400 dark:text-white/40 mb-1">{plan.period}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-500 dark:text-gold-400" />
                  <span className="text-sm text-gold-600 dark:text-gold-400 font-medium">{plan.credits}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-white/80">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300 dark:text-white/25 line-through">
                    <div className="w-4 h-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.type === null ? (
                isSignedIn && !isSubscribed ? (
                  <div className="btn-secondary text-center text-sm py-2.5 cursor-default">
                    Current Plan (Free)
                  </div>
                ) : (
                  <SignInButton mode="modal">
                    <button className="w-full btn-secondary text-sm py-2.5">
                      {plan.cta} <ArrowRight className="w-4 h-4" />
                    </button>
                  </SignInButton>
                )
              ) : isSignedIn ? (
                <button
                  onClick={() => {
                    if (isSubscribed) {
                      // User is subscribed → go to Stripe billing portal
                      handleCheckout('manage');
                    } else {
                      // Not subscribed → checkout
                      handleCheckout(plan.type);
                    }
                  }}
                  disabled={loading !== null}
                  className={`w-full text-sm py-3 ${plan.name === 'Premium' && !isSubscribed ? 'btn-gold' : 'btn-secondary'}`}
                >
                  {loading === plan.type
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <>{plan.name === 'Premium' ? <Star className="w-4 h-4" /> : <Zap className="w-4 h-4" />} {plan.name === 'Premium' ? isSubscribed ? 'Manage Subscription' : plan.cta : plan.cta}</>
                  }
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className={`w-full text-sm py-3 ${plan.name === 'Premium' ? 'btn-gold' : 'btn-primary'}`}>
                    Sign in to {plan.cta}
                  </button>
                </SignInButton>
              )}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 dark:text-white/30">
            {['🔒 Secure payments via Stripe', '🧒 100% family-safe AI', '📧 Cancel anytime', '💳 No charges without consent'].map((b) => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
