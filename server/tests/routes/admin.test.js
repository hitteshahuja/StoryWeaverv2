const request = require('supertest');
const pool = require('../../db/pool');

// Mock the database pool
jest.mock('../../db/pool');

// Mock Clerk authentication - must be done before requiring app
jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressRequireAuth: jest.fn(() => (req, res, next) => {
    // Mock middleware that simulates Clerk authentication
    if (req.headers.authorization) {
      // Extract mock user ID from token (in real tests, this would be more sophisticated)
      const token = req.headers.authorization.replace('Bearer ', '');
      if (token === 'mock_admin_token') {
        req.auth = { userId: 'clerk_admin_123' };
      } else if (token === 'mock_super_admin_token') {
        req.auth = { userId: 'clerk_super_admin_123' };
      } else if (token === 'mock_user_token') {
        req.auth = { userId: 'clerk_user_123' };
      }
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication token required.' });
    }
  }),
  clerkClient: {
    verifyToken: jest.fn()
  }
}));

// Import app after mocks are set up
const app = require('../../index');

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAILS = 'admin@example.com,hitteshahuja@gmail.com';
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  describe('GET /api/admin/verify', () => {
    it('should return { isAdmin: true } for authorized admin', async () => {
      // Mock database query to return admin email
      pool.query.mockResolvedValue({
        rows: [{ email: 'admin@example.com' }]
      });

      const response = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ isAdmin: true });
    });

    it('should return 403 for non-admin user', async () => {
      // Mock database query to return non-admin email
      pool.query.mockResolvedValue({
        rows: [{ email: 'regular@example.com' }]
      });

      const response = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', 'Bearer mock_user_token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Forbidden');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/admin/verify');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should authorize the designated super admin', async () => {
      // Mock database query to return super admin email
      pool.query.mockResolvedValue({
        rows: [{ email: 'hitteshahuja@gmail.com' }]
      });

      const response = await request(app)
        .get('/api/admin/verify')
        .set('Authorization', 'Bearer mock_super_admin_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ isAdmin: true });
    });
  });

  describe('GET /api/admin/users', () => {
    const mockUsers = [
      {
        id: 1,
        email: 'user1@example.com',
        name: 'User One',
        credits: 5,
        subscription_status: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        email: 'user2@example.com',
        name: 'User Two',
        credits: 3,
        subscription_status: false,
        created_at: '2024-01-02T00:00:00Z'
      }
    ];

    it('should return paginated user list for admin', async () => {
      // Mock admin authorization
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Users query

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toEqual(mockUsers);
      expect(response.body.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('should search users by email using ILIKE', async () => {
      const searchResults = [mockUsers[0]];
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: searchResults }); // Users query

      const response = await request(app)
        .get('/api/admin/users?search=user1')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(searchResults);
      expect(response.body.pagination.total).toBe(1);
      
      // Verify ILIKE search was used
      const usersQueryCall = pool.query.mock.calls[2];
      expect(usersQueryCall[0]).toContain('ILIKE');
      expect(usersQueryCall[1]).toContain('%user1%');
    });

    it('should search users by name using ILIKE', async () => {
      const searchResults = [mockUsers[1]];
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: searchResults }); // Users query

      const response = await request(app)
        .get('/api/admin/users?search=Two')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(searchResults);
      
      // Verify ILIKE search was used
      const usersQueryCall = pool.query.mock.calls[2];
      expect(usersQueryCall[0]).toContain('ILIKE');
      expect(usersQueryCall[1]).toContain('%Two%');
    });

    it('should handle pagination with custom page and limit', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '50' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Users query

      const response = await request(app)
        .get('/api/admin/users?page=2&limit=10')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5
      });
      
      // Verify LIMIT and OFFSET were applied correctly
      const usersQueryCall = pool.query.mock.calls[2];
      expect(usersQueryCall[1]).toContain(10); // LIMIT
      expect(usersQueryCall[1]).toContain(10); // OFFSET (page 2 - 1) * 10
    });

    it('should exclude sensitive user data from response', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Users query

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      
      // Verify query only selects allowed fields
      const usersQueryCall = pool.query.mock.calls[2];
      const query = usersQueryCall[0];
      
      // Should include these fields
      expect(query).toContain('email');
      expect(query).toContain('name');
      expect(query).toContain('credits');
      expect(query).toContain('subscription_status');
      expect(query).toContain('created_at');
      
      // Should NOT include these fields
      expect(query).not.toContain('child_name');
      expect(query).not.toContain('child_age');
      expect(query).not.toContain('books');
      expect(query).not.toContain('stories');
    });

    it('should return 403 for non-admin user', async () => {
      pool.query.mockResolvedValue({
        rows: [{ email: 'regular@example.com' }]
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer mock_user_token');

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockRejectedValueOnce(new Error('Database connection failed')); // Count query fails

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal Server Error');
      expect(response.body).toHaveProperty('message', 'Failed to fetch users');
    });

    it('should default to page 1 and limit 20 when not specified', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '100' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Users query

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    it('should cap limit at 100 to prevent excessive queries', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '200' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Users query

      const response = await request(app)
        .get('/api/admin/users?limit=500')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });

    it('should handle empty search results', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ email: 'admin@example.com' }] }) // Admin check
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Users query

      const response = await request(app)
        .get('/api/admin/users?search=nonexistent')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.totalPages).toBe(0);
    });
  });
});
