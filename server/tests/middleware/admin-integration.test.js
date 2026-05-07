const request = require('supertest');
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/admin');
const pool = require('../../db/pool');

// Mock dependencies
jest.mock('../../db/pool');
jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: jest.fn(() => (req, res, next) => {
    // Mock successful Clerk authentication
    if (req.headers.authorization === 'Bearer valid_token') {
      req.auth = { userId: 'clerk_test_user_123' };
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication token required.' });
    }
  })
}));

describe('Admin middleware integration with requireAuth', () => {
  let app;

  beforeEach(() => {
    // Create a test Express app
    app = express();
    app.use(express.json());

    // Set up test route with chained middleware
    app.get('/api/admin/test', requireAuth, requireAdmin, (req, res) => {
      res.json({ 
        success: true, 
        message: 'Admin access granted',
        adminEmail: req.adminEmail 
      });
    });

    // Set environment variable
    process.env.ADMIN_EMAILS = 'admin@example.com,hitteshahuja@gmail.com';
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
    jest.clearAllMocks();
  });

  it('should reject requests without authentication token', async () => {
    const response = await request(app)
      .get('/api/admin/test');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should reject authenticated non-admin users', async () => {
    pool.query.mockResolvedValue({ 
      rows: [{ email: 'regular@example.com' }] 
    });

    const response = await request(app)
      .get('/api/admin/test')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    expect(response.body.message).toBe('You do not have permission to access this resource.');
  });

  it('should allow authenticated admin users', async () => {
    pool.query.mockResolvedValue({ 
      rows: [{ email: 'admin@example.com' }] 
    });

    const response = await request(app)
      .get('/api/admin/test')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.adminEmail).toBe('admin@example.com');
  });

  it('should allow the designated super admin', async () => {
    pool.query.mockResolvedValue({ 
      rows: [{ email: 'hitteshahuja@gmail.com' }] 
    });

    const response = await request(app)
      .get('/api/admin/test')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.adminEmail).toBe('hitteshahuja@gmail.com');
  });

  it('should properly chain requireAuth before requireAdmin', async () => {
    // This test verifies that requireAuth runs first
    // If requireAdmin ran first, it would fail trying to access req.auth.userId
    pool.query.mockResolvedValue({ 
      rows: [{ email: 'admin@example.com' }] 
    });

    const response = await request(app)
      .get('/api/admin/test')
      .set('Authorization', 'Bearer valid_token');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT email FROM users WHERE clerk_id = $1',
      ['clerk_test_user_123']
    );
  });
});
