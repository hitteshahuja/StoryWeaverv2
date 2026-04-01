import { Link } from 'react-router-dom';
import { X, Sparkles, CreditCard, Zap, ArrowRight } from 'lucide-react';
import { stripeAPI } from '../lib/api';
import { useState } from 'react';

export default function CreditModal({ onClose }) {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (type) => {
    setLoading(type);
    try {
      const { url } = await stripeAPI.createCheckout(type);
      window.location.href = url;
    } catch {
      alert('Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md card border border-dream-500/30 shadow-dream-lg animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20 mb-4">
            <Sparkles className="w-7 h-7 text-gold-600 dark:text-gold-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">You're out of credits!</h2>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-2">Choose a way to keep the magic going</p>
        </div>

        <div className="space-y-3">
          {/* Top-up option */}
          <button
            onClick={() => handleCheckout('topup')}
            disabled={loading !== null}
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10
                       hover:border-dream-300 dark:hover:border-dream-500/40 transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-dream-50 dark:bg-dream-500/10">
                  <Zap className="w-5 h-5 text-dream-600 dark:text-dream-300" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">5 Credits Top-up</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">One-time purchase</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">$3.00</p>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Subscription option */}
          <button
            onClick={() => handleCheckout('subscription')}
            disabled={loading !== null}
            className="w-full p-4 rounded-xl border border-dream-500/40 bg-gradient-card
                       hover:border-dream-400 hover:shadow-dream transition-all duration-200 text-left group relative"
          >
            <div className="absolute -top-2.5 left-4">
              <span className="badge-gold">Best Value ✨</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold-50 dark:bg-gold-500/10">
                  <CreditCard className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Premium Monthly</p>
                  <p className="text-xs text-gray-500 dark:text-white/40">15 credits/month + TTS & Vault</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">$9.99<span className="text-xs text-gray-500 dark:text-white/40">/mo</span></p>
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/pricing" onClick={onClose} className="text-xs text-dream-600 dark:text-dream-400 hover:text-dream-800 dark:hover:text-dream-300 transition-colors">
            View full pricing details →
          </Link>
        </div>
      </div>
    </div>
  );
}
