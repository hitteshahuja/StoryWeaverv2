import { useEffect, useState, useCallback, useRef } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, CreditCard, LayoutDashboard, Loader2, RefreshCw, ArrowUpRight, Settings, CheckCircle2 } from 'lucide-react';
import StarField from '../components/StarField';
import Footer from '../components/Footer';
import { usersAPI, stripeAPI } from '../lib/api';
import { useDbUser } from '../context/UserContext';
import { Toast, setToastHandler } from '../components/Toast';
import formbricks from '@formbricks/js';

export default function DashboardPage() {
  const { isSignedIn } = useAuth();
  const { dbUser, refreshUser } = useDbUser();
  const [billing, setBilling] = useState([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState({ active: false, cancelAtPeriodEnd: false });
  const [statusLoading, setStatusLoading] = useState(true);
  const [toast, setToast] = useState(null);


  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const refreshHasRun = useRef(false);

  useEffect(() => {
    setToastHandler(showToast);

    // Handle checkout success/cancel params
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success && !refreshHasRun.current) {
      refreshHasRun.current = true;
      const type = success === 'subscription' ? 'Premium Subscription' : 'Credit Top-up';
      showToast(`${type} successful! Syncing your credits...`, 'success');

      // Delay refresh slightly to give webhook time to finish
      setTimeout(async () => {
        await refreshUser();
        // Clear params
        searchParams.delete('success');
        setSearchParams(searchParams, { replace: true });
        showToast('Credits updated!', 'success');
      }, 2000);
    }

    if (canceled) {
      showToast('Checkout was canceled.', 'info');
      searchParams.delete('canceled');
      setSearchParams(searchParams, { replace: true });
    }
  }, [showToast, searchParams, setSearchParams, refreshUser]);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const status = await stripeAPI.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    usersAPI.billing().then(setBilling).catch(console.error).finally(() => setBillingLoading(false));
    fetchSubscriptionStatus();
  }, [isSignedIn, fetchSubscriptionStatus]);

  if (!isSignedIn) return <RedirectToSignIn />;

  const handleCheckout = async (type) => {
    setCheckoutLoading(type);
    try {
      if (type === 'manage') {
        const { url } = await stripeAPI.createPortal();
        window.location.href = url;
      } else {
        const { url } = await stripeAPI.createCheckout(type);
        window.location.href = url;
      }
    } catch {
      showToast('Could not start checkout. Please try again.', 'error');
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to Premium features at the end of your billing period.')) return;
    setCancelLoading(true);
    try {
      await stripeAPI.cancelSubscription();
      showToast('Your subscription has been canceled. You will have access until the end of your billing period.', 'success');
      fetchSubscriptionStatus();
    } catch {
      showToast('Could not cancel subscription. Please try again.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelLoading(true);
    try {
      await stripeAPI.reactivateSubscription();
      showToast('Subscription reactivated!', 'success');
      fetchSubscriptionStatus();
    } catch {
      showToast('Could not reactivate subscription. Please try again.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const credits = dbUser?.credits ?? 0;
  const isSubscribed = dbUser?.subscription_status;
  const isCanceling = subscriptionStatus.cancelAtPeriodEnd;

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
              <button
                onClick={() => handleCheckout('manage')}
                disabled={checkoutLoading !== null}
                className="w-full btn-primary text-sm py-2.5"
              >
                {checkoutLoading === 'manage'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  : <><Settings className="w-4 h-4" /> Manage Subscription</>
                }
              </button>
            )}

            {isSubscribed && (
              <>
                {!isCanceling && <p className="text-sm text-gray-500 dark:text-white/50">✓ 15 credits/month · TTS · Private Vault</p>}

                {isCanceling ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">⚠️ Canceling at period end — access until {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}</p>
                ) : null}

                {isCanceling ? (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={cancelLoading}
                    className="w-full btn-primary text-sm py-2.5 mt-2"
                  >
                    {cancelLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                      : 'Reactivate Subscription'
                    }
                  </button>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="w-full btn-secondary text-sm py-2.5 mt-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {cancelLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Canceling...</>
                      : 'Cancel Subscription'
                    }
                  </button>
                )}
              </>
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

        {/* Consent status */}
        {dbUser?.consent_given && (
          <div className="card mb-6 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Parental Consent Given</p>
                <p className="text-sm text-gray-500 dark:text-white/50">You have completed the parental consent process</p>
              </div>
              <input
                type="checkbox"
                checked
                disabled
                className="ml-auto w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-emerald-500 bg-emerald-500/20 cursor-not-allowed"
              />
            </div>
          </div>
        )}

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

      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
