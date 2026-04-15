const express = require('express');
const router = express.Router();
const stripe = require('../services/stripe');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// POST /api/stripe/create-checkout — create Stripe checkout session
router.post('/create-checkout', requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;
  const { type } = req.body; // 'subscription' | 'topup'

  if (!['subscription', 'topup'].includes(type)) {
    return res.status(400).json({ error: 'Invalid checkout type' });
  }
  console.log(clerkId)
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;
    console.log(customerId)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { clerk_id: clerkId, user_id: String(user.id) },
      });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, user.id]);
    }

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    let sessionConfig;
    if (type === 'subscription') {
      sessionConfig = {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
        success_url: `${baseUrl}/dashboard?success=subscription`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { type: 'subscription', clerk_id: clerkId },
        allow_promotion_codes: true,
      };
    } else {
      sessionConfig = {
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_TOPUP_PRICE_ID, quantity: 1 }],
        success_url: `${baseUrl}/dashboard?success=topup`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { type: 'topup', clerk_id: clerkId },
      };
    }

    console.log('[Checkout] Session config:', JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('[Checkout] Created session:', session.id, 'mode:', session.mode, 'metadata:', session.metadata);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[POST /stripe/create-checkout]', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/create-subscription-portal — create Stripe billing portal session
router.post('/create-subscription-portal', requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;
  
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = userRes.rows[0];
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: process.env.CLIENT_URL || 'http://localhost:5173/dashboard',
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error('[POST /stripe/create-subscription-portal]', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// TEST: Simulate webhook for debugging
router.post('/test-simulate-webhook', async (req, res) => {
  const { clerk_id, mode } = req.body;
  console.log('[TEST] Simulating webhook for:', clerk_id, 'mode:', mode);
  
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerk_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    
    if (mode === 'subscription') {
      await pool.query(
        'UPDATE users SET credits = 15, subscription_status = TRUE WHERE id = $1',
        [user.id]
      );
      await pool.query(
        `INSERT INTO billing_history (user_id, amount, type, description)
         VALUES ($1, 999, 'subscription', 'TEST: Premium Monthly — 15 Credits')`,
        [user.id]
      );
      console.log('[TEST] ✓ Applied subscription to user:', clerk_id);
    }
    
    res.json({ success: true, credits: user.credits + 15, subscription_status: true });
  } catch (err) {
    console.error('[TEST] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST: Manually trigger webhook processing for a session
router.post('/test-process-session', async (req, res) => {
  const { sessionId } = req.body;
  console.log('[TEST] Fetching session:', sessionId);
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('[TEST] Session retrieved:', session.id);
    console.log('[TEST] Session metadata:', session.metadata);
    console.log('[TEST] Session mode:', session.mode);
    console.log('[TEST] Session customer:', session.customer);
    
    const clerkId = session.metadata?.clerk_id;
    const paymentType = session.metadata?.type;
    
    // Process the session
    if (!clerkId) {
      return res.status(400).json({ error: 'No clerkId in session metadata' });
    }
    
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    
    if (session.mode === 'subscription') {
      await pool.query(
        'UPDATE users SET credits = 15, subscription_status = TRUE WHERE id = $1',
        [user.id]
      );
      await pool.query(
        `INSERT INTO billing_history (user_id, amount, type, description)
         VALUES ($1, 999, 'subscription', 'TEST: Premium Monthly — 15 Credits')`,
        [user.id]
      );
      console.log('[TEST] ✓ Applied subscription to user:', clerkId);
      return res.json({ success: true, action: 'subscription_added', credits: 15 });
    } else if (session.mode === 'payment') {
      await pool.query('UPDATE users SET credits = credits + 5 WHERE id = $1', [user.id]);
      console.log('[TEST] ✓ Added 5 credits for topup');
      return res.json({ success: true, action: 'topup_added', credits: 5 });
    }
    
    res.json({ success: false, error: 'Unknown session mode' });
  } catch (err) {
    console.error('[TEST] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/test-webhook-receiver - Test endpoint to verify webhooks are reaching
router.post('/test-webhook-receiver', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('[TEST-WEBHOOK] ★ Received test webhook');
  console.log('[TEST-WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2).slice(0, 300));
  console.log('[TEST-WEBHOOK] Body length:', req.body?.length);
  console.log('[TEST-WEBHOOK] Body preview:', req.body?.toString().slice(0, 200));
  
  res.json({ success: true, received: true });
});

// POST /api/stripe/webhook — handle Stripe events (no auth middleware — Stripe signs the payload)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('[Webhook] ★ Received request at', new Date().toISOString());
  console.log('[Webhook] Headers:', JSON.stringify(req.headers, null, 2).slice(0, 500));
  console.log('[Webhook] Body type:', typeof req.body);
  console.log('[Webhook] Body length:', req.body?.length);
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('[Webhook] ★ Verified, type:', event.type);
  } catch (err) {
    console.error('[Stripe Webhook] ✗ Signature verification failed:', err.message);
    console.error('[Stripe Webhook] Expected secret:', process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 20));
    console.error('[Stripe Webhook] Got signature:', sig?.slice(0, 30));
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log('[Webhook] Event type:', event.type);
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[Webhook] ✓ checkout.session.completed received');
        console.log('[Webhook] Session ID:', session.id);
        console.log('[Webhook] Session mode:', session.mode);
        console.log('[Webhook] Session metadata:', session.metadata);
        
        const clerkId = session.metadata?.clerk_id;
        const paymentType = session.metadata?.type;
        
        console.log('[Webhook] clerkId:', clerkId);
        console.log('[Webhook] paymentType:', paymentType);

        if (!clerkId) {
          console.log('[Webhook] ⚠ No clerkId - trying customer lookup');
          // Fallback: try to find user by stripe_customer_id
          if (session.customer) {
            const userRes = await pool.query('SELECT * FROM users WHERE stripe_customer_id = $1', [session.customer]);
            if (userRes.rows.length > 0) {
              const user = userRes.rows[0];
              console.log('[Webhook] Found user by customer ID:', user.clerk_id);
              // Apply subscription based on session mode
              await pool.query(
                'UPDATE users SET credits = 15, subscription_status = TRUE WHERE id = $1',
                [user.id]
              );
              console.log('[Webhook] ✓ Applied substitution credits (15)');
              break;
            }
          }
          console.log('[Webhook] ✗ Could not find user');
          break;
        }

        const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
        if (userRes.rows.length === 0) break;
        const user = userRes.rows[0];

        if (session.metadata?.type === 'topup') {
          // One-time top-up: add 5 credits
          await pool.query('UPDATE users SET credits = credits + 5 WHERE id = $1', [user.id]);
          await pool.query(
            `INSERT INTO billing_history (user_id, stripe_payment_intent, amount, type, description)
             VALUES ($1, $2, 300, 'topup', '5 Credit Top-up')`,
            [user.id, session.payment_intent]
          );
        } else if (session.metadata?.type === 'subscription') {
          // New subscription: set to 15 credits, enable subscription
          await pool.query(
            'UPDATE users SET credits = 15, subscription_status = TRUE WHERE id = $1',
            [user.id]
          );
          await pool.query(
            `INSERT INTO billing_history (user_id, amount, type, description)
             VALUES ($1, 999, 'subscription', 'Premium Monthly — 15 Credits')`,
            [user.id]
          );
        }
        break;
      }

      case 'invoice.paid': {
        // Monthly subscription renewal: reset credits to 15
        const invoice = event.data.object;

        // Ignore the first invoice as it's processed by checkout.session.completed
        if (invoice.billing_reason !== 'subscription_cycle') {
          break;
        }

        const customerId = invoice.customer;
        const userRes = await pool.query('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
        if (userRes.rows.length === 0) break;
        const user = userRes.rows[0];

        if (user.subscription_status) {
          await pool.query('UPDATE users SET credits = 15 WHERE id = $1', [user.id]);
          await pool.query(
            `INSERT INTO billing_history (user_id, amount, type, description)
             VALUES ($1, 999, 'subscription', 'Monthly renewal — 15 Credits reset')`,
            [user.id]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        await pool.query(
          'UPDATE users SET subscription_status = FALSE, subscription_cancel_at_period_end = FALSE WHERE stripe_customer_id = $1',
          [customerId]
        );
        break;
      }

      case 'subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        await pool.query(
          'UPDATE users SET subscription_cancel_at_period_end = $1 WHERE stripe_customer_id = $2',
          [sub.cancel_at_period_end, customerId]
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
  }

  res.json({ received: true });
});

// POST /api/stripe/cancel-subscription — cancel at period end
router.post('/cancel-subscription', requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const sub = subscriptions.data[0];
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    await pool.query(
      'UPDATE users SET subscription_cancel_at_period_end = TRUE WHERE clerk_id = $1',
      [clerkId]
    );

    res.json({ message: 'Subscription will be canceled at period end' });
  } catch (err) {
    console.error('[POST /stripe/cancel-subscription]', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/stripe/reactivate-subscription — reactivate a canceled subscription
router.post('/reactivate-subscription', requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const sub = subscriptions.data[0];
    await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: false,
    });

    await pool.query(
      'UPDATE users SET subscription_cancel_at_period_end = FALSE WHERE clerk_id = $1',
      [clerkId]
    );

    res.json({ message: 'Subscription reactivated' });
  } catch (err) {
    console.error('[POST /stripe/reactivate-subscription]', err);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// GET /api/stripe/subscription-status — get current subscription status
router.get('/subscription-status', requireAuth, async (req, res) => {
  const clerkId = req.auth.userId;
  console.log(clerkId)
  try {
    const userRes = await pool.query('SELECT subscription_status, stripe_customer_id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { subscription_status: subStatus, stripe_customer_id: customerId } = userRes.rows[0];
    console.log(subStatus, customerId)
    if (!customerId || !subStatus) {
      return res.json({ active: false, cancelAtPeriodEnd: false });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    console.log(subscriptions)
    if (subscriptions.data.length === 0) {
      return res.json({ active: false, cancelAtPeriodEnd: false });
    }

    const sub = subscriptions.data[0];
    const periodEnd = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null;
    const periodEndStr = periodEnd && !isNaN(periodEnd.getTime()) ? periodEnd.toISOString() : null;
    res.json({
      active: true,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: periodEndStr,
    });
  } catch (err) {
    console.error('[GET /stripe/subscription-status]', err);
    res.json({ active: false, cancelAtPeriodEnd: false });
  }
});

module.exports = router;
