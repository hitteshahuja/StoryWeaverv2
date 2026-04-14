const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    console.log(sessionConfig)
    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[POST /stripe/create-checkout]', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/webhook — handle Stripe events (no auth middleware — Stripe signs the payload)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(event)
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const clerkId = session.metadata?.clerk_id;
        if (!clerkId) break;

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
