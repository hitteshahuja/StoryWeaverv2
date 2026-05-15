const { requireAdmin } = require('../../middleware/admin');
const pool = require('../../db/pool');

// Mock the database pool
jest.mock('../../db/pool');

describe('requireAdmin middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup request, response, and next function
    req = {
      auth: {
        userId: 'clerk_test_user_123'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    // Set default environment variable
    process.env.ADMIN_EMAILS = 'admin@example.com,hitteshahuja@gmail.com';
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  describe('Authentication checks', () => {
    it('should return 401 if req.auth is missing', async () => {
      req.auth = undefined;

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if req.auth.userId is missing', async () => {
      req.auth = {};

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Database user lookup', () => {
    it('should return 403 if user not found in database', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await requireAdmin(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT email FROM users WHERE clerk_id = $1',
        ['clerk_test_user_123']
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'User not found in database.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user email is null', async () => {
      pool.query.mockResolvedValue({ rows: [{ email: null }] });

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'User email not available.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Admin authorization', () => {
    it('should return 500 if ADMIN_EMAILS environment variable is not set', async () => {
      delete process.env.ADMIN_EMAILS;
      pool.query.mockResolvedValue({ rows: [{ email: 'admin@example.com' }] });

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Configuration Error',
        message: 'Admin authorization not configured.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user email is not in admin list', async () => {
      pool.query.mockResolvedValue({ rows: [{ email: 'regular@example.com' }] });

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user email is in admin list', async () => {
      pool.query.mockResolvedValue({ rows: [{ email: 'admin@example.com' }] });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.adminEmail).toBe('admin@example.com');
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email matching', async () => {
      pool.query.mockResolvedValue({ rows: [{ email: 'ADMIN@EXAMPLE.COM' }] });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.adminEmail).toBe('ADMIN@EXAMPLE.COM');
    });

    it('should handle whitespace in ADMIN_EMAILS environment variable', async () => {
      process.env.ADMIN_EMAILS = ' admin@example.com , hitteshahuja@gmail.com ';
      pool.query.mockResolvedValue({ rows: [{ email: 'admin@example.com' }] });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.adminEmail).toBe('admin@example.com');
    });

    it('should authorize the designated super admin', async () => {
      pool.query.mockResolvedValue({ rows: [{ email: 'hitteshahuja@gmail.com' }] });

      await requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.adminEmail).toBe('hitteshahuja@gmail.com');
    });
  });

  describe('Error handling', () => {
    it('should return 500 if database query fails', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      await requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An error occurred while verifying admin authorization.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Request augmentation', () => {
    it('should attach adminEmail to request object for audit logging', async () => {
      const testEmail = 'admin@example.com';
      pool.query.mockResolvedValue({ rows: [{ email: testEmail }] });

      await requireAdmin(req, res, next);

      expect(req.adminEmail).toBe(testEmail);
      expect(next).toHaveBeenCalled();
    });
  });
});
