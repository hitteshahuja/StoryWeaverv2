import { useEffect, useState } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Sparkles, CreditCard, LayoutDashboard, Loader2, RefreshCw, ArrowUpRight } from 'lucide-react';
import StarField from '../components/StarField';
import { usersAPI, stripeAPI } from '../lib/api';
import { useDbUser } from '../context/UserContext';

export default function DashboardPage() {
  const { isSignedIn } = useAuth();
  const { dbUser, refreshUser } = useDbUser();
  const [billing, setBilling] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  if (!isSignedIn) return <RedirectToSignIn />;

  useEffect(() => {
    usersAPI.billing().then(setBilling).catch(console.error).finally(() => setBillingLoading(false));
  }, []);

  const handleCheckout = async (type) => {
    setCheckoutLoading(type);
    try {
      const { url } = await stripeAPI.createCheckout(type);
      window.location.href = url;
    } catch {
      alert('Could not start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  const credits = dbUser?.credits ?? 0;
  const isSubscribed = dbUser?.subscription_status;

  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
            <LayoutDashboard className="w-5 h-5 text-dream-600 dark:text-dream-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-white/50 text-sm">Manage your credits and subscription</p>
          </div>
        </div>

        {/* Credits card */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div className="card border-dream-500/30 bg-gradient-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Remaining Credits</p>
                <p className="text-5xl font-bold text-gray-900 dark:text-white">{credits}</p>
                <p className="text-sm text-gray-500 dark:text-white/40 mt-1">
                  {isSubscribed ? '15 reset monthly with Premium' : 'Top up anytime'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-dream-500/10 border border-dream-500/20">
                <Sparkles className="w-6 h-6 text-gold-400" />
              </div>
            </div>

            {/* Credit bar */}
            <div className="mt-4 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-dream-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((credits / (isSubscribed ? 15 : 3)) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="card">
            <p className="text-xs text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">Subscription</p>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-gray-200 dark:bg-white/20'}`} />
              <span className="font-semibold text-gray-900 dark:text-white">
                {isSubscribed ? 'Premium Active 🌟' : 'Free Plan'}
              </span>
            </div>

            {!isSubscribed ? (
              <button
                onClick={() => handleCheckout('subscription')}
                disabled={checkoutLoading !== null}
                className="w-full btn-primary text-sm py-2.5"
              >
                {checkoutLoading === 'subscription'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  : <><ArrowUpRight className="w-4 h-4" /> Upgrade to Premium</>
                }
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-white/50">✓ 15 credits/month · TTS · Private Vault</p>
            )}

            <button
              onClick={() => handleCheckout('topup')}
              disabled={checkoutLoading !== null}
              className="w-full btn-secondary text-sm py-2.5 mt-2"
            >
              {checkoutLoading === 'topup'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                : <><Sparkles className="w-4 h-4" /> Buy 5 Credits — $3.00</>
              }
            </button>
          </div>
        </div>

        {/* Billing history */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-dream-600 dark:text-dream-300" /> Billing History
            </h2>
            <button onClick={() => usersAPI.billing().then(setBilling)} className="text-xs text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {billingLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-dream-400 animate-spin" />
            </div>
          ) : billing.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No billing history yet</p>
          ) : (
            <div className="space-y-2">
              {billing.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p>
                    <p className="text-xs text-gray-400 dark:text-white/30">
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.amount === 0 ? 'FREE' : `$${(item.amount / 100).toFixed(2)}`}
                    </p>
                    <span className={`text-xs ${item.type === 'subscription' ? 'text-dream-600 dark:text-dream-300' : item.type === 'topup' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-white/40'}`}>
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
