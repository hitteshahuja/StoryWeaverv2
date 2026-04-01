const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// Protect any route — rejects requests without a valid Clerk JWT
const requireAuth = ClerkExpressRequireAuth({
  onError: (err, req, res, next) => {
    console.error('[Auth Error]', err.message);
    res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication token required.' });
  },
});

module.exports = { requireAuth };
