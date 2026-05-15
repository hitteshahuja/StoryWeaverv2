# Middleware Documentation

## Authentication & Authorization

### `requireAuth` - Authentication Middleware

Located in `server/middleware/auth.js`

Verifies that the request contains a valid Clerk JWT token. This middleware should be applied to all protected routes that require a logged-in user.

**Usage:**
```javascript
const { requireAuth } = require('./middleware/auth');

app.get('/api/protected-route', requireAuth, (req, res) => {
  // Access authenticated user via req.auth.userId (Clerk ID)
  const clerkId = req.auth.userId;
  res.json({ message: 'Authenticated!' });
});
```

**Behavior:**
- Validates Clerk JWT token from Authorization header
- Sets `req.auth.userId` to the Clerk user ID
- Returns 401 Unauthorized if token is missing or invalid

---

### `requireAdmin` - Admin Authorization Middleware

Located in `server/middleware/admin.js`

Verifies that the authenticated user's email is in the `ADMIN_EMAILS` environment variable. This middleware **must be chained after** `requireAuth`.

**Usage:**
```javascript
const { requireAuth } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');

// Chain requireAuth before requireAdmin
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  // Access admin email via req.adminEmail
  const adminEmail = req.adminEmail;
  res.json({ message: 'Admin access granted!' });
});
```

**Environment Configuration:**

Add admin emails to your `.env` file as a comma-separated list:
```env
ADMIN_EMAILS=admin@example.com,hitteshahuja@gmail.com,another@example.com
```

**Behavior:**
1. Checks that `req.auth.userId` exists (set by `requireAuth`)
2. Queries database to get user's email from `users` table
3. Compares email (case-insensitive) against `ADMIN_EMAILS` list
4. If authorized:
   - Sets `req.adminEmail` for audit logging
   - Calls `next()` to proceed to route handler
5. If not authorized:
   - Returns 403 Forbidden

**Error Responses:**
- `401 Unauthorized` - Missing authentication (should be caught by requireAuth)
- `403 Forbidden` - User not in admin list or user not found in database
- `500 Internal Server Error` - Database error or ADMIN_EMAILS not configured

**Security Notes:**
- Always chain `requireAuth` before `requireAdmin`
- Email matching is case-insensitive
- Whitespace in `ADMIN_EMAILS` is automatically trimmed
- Unauthorized access attempts are logged with `console.warn`
- The middleware attaches `req.adminEmail` for audit logging purposes

**Example Route Setup:**
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Public route - no middleware
router.get('/api/public', (req, res) => {
  res.json({ message: 'Public access' });
});

// Protected route - requires authentication
router.get('/api/user/profile', requireAuth, (req, res) => {
  res.json({ message: 'User access' });
});

// Admin route - requires authentication AND admin authorization
router.get('/api/admin/dashboard', requireAuth, requireAdmin, (req, res) => {
  res.json({ 
    message: 'Admin access',
    adminEmail: req.adminEmail 
  });
});

module.exports = router;
```
