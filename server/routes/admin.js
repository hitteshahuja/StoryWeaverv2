const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const pool = require('../db/pool');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/verify - Verify admin authorization
// Requirements: 8.1, 1.2
router.get('/verify', (req, res) => {
  // If the request reaches this handler, the user is authenticated and authorized as admin
  // (requireAuth and requireAdmin middleware have already validated)
  res.json({ isAdmin: true });
});

// GET /api/admin/users - Search and list users with pagination
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    
    // Parse and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20)); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    // Build the WHERE clause for search
    let whereClause = '';
    let queryParams = [];
    
    if (search && search.trim()) {
      whereClause = 'WHERE email ILIKE $1 OR name ILIKE $1';
      queryParams.push(`%${search.trim()}%`);
    }

    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated user results
    // Exclude: books, book_pages, stories, photos, child_name, child_age
    // Include: email, name, credits, subscription_status, created_at
    const limitParam = queryParams.length + 1;
    const offsetParam = queryParams.length + 2;
    const usersQuery = `
      SELECT 
        id,
        email,
        name,
        credits,
        subscription_status,
        created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    const usersResult = await pool.query(usersQuery, [...queryParams, limitNum, offset]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      users: usersResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to fetch users' 
    });
  }
});

// POST /api/admin/users/:id/credits - Adjust user credits
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5
router.post(
  '/users/:id/credits',
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('reason').trim().notEmpty().withMessage('Reason is required and cannot be empty'),
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        message: errors.array()[0].msg,
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id, 10);
    const { amount, reason } = req.body;
    const amountNum = parseFloat(amount);

    // Additional validation for amount
    if (!Number.isFinite(amountNum)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be a valid number'
      });
    }

    // Get admin email from the authenticated user
    const adminClerkId = req.auth.userId;
    
    // Start database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get admin user email
      const adminResult = await client.query(
        'SELECT email FROM users WHERE clerk_id = $1',
        [adminClerkId]
      );

      if (adminResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Admin user not found'
        });
      }

      const adminEmail = adminResult.rows[0].email;

      // Get target user and current credit balance
      const userResult = await client.query(
        'SELECT id, email, name, credits FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      const targetUser = userResult.rows[0];
      const previousBalance = targetUser.credits || 0;
      const newBalance = previousBalance + amountNum;

      // Update user credits (allow negative balances per Requirement 3.4)
      await client.query(
        'UPDATE users SET credits = $1 WHERE id = $2',
        [newBalance, userId]
      );

      // Insert billing_history record with type 'admin_adjustment'
      await client.query(
        `INSERT INTO billing_history (user_id, amount, type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, amountNum, 'admin_adjustment', reason]
      );

      // Insert admin_audit_log entry
      await client.query(
        `INSERT INTO admin_audit_log (
          admin_email, 
          target_user_id, 
          action_type, 
          action_details, 
          previous_value, 
          new_value, 
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          adminEmail,
          userId,
          'credit_adjustment',
          JSON.stringify({ amount: amountNum, reason }),
          previousBalance.toString(),
          newBalance.toString()
        ]
      );

      // Commit transaction
      await client.query('COMMIT');

      res.json({
        success: true,
        newBalance,
        previousBalance,
        adjustment: amountNum,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name
        }
      });

    } catch (error) {
      // Rollback transaction on any error
      await client.query('ROLLBACK');
      console.error('Error adjusting credits:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to adjust credits'
      });
    } finally {
      client.release();
    }
  }
);

// GET /api/admin/audit-log - Retrieve audit log entries with pagination
// Requirements: 8.4, 4.4
router.get('/audit-log', async (req, res) => {
  try {
    const { page = 1, limit = 50, userId } = req.query;
    
    // Parse and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50)); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    // Build the WHERE clause for optional userId filter
    let whereClause = '';
    let queryParams = [];
    
    if (userId) {
      const userIdNum = parseInt(userId, 10);
      if (!isNaN(userIdNum) && userIdNum > 0) {
        whereClause = 'WHERE target_user_id = $1';
        queryParams.push(userIdNum);
      }
    }

    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM admin_audit_log ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated audit log entries
    const limitParam = queryParams.length + 1;
    const offsetParam = queryParams.length + 2;
    const auditQuery = `
      SELECT 
        id,
        admin_email,
        target_user_id,
        action_type,
        action_details,
        previous_value,
        new_value,
        timestamp
      FROM admin_audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    const auditResult = await pool.query(auditQuery, [...queryParams, limitNum, offset]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      auditLog: auditResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to fetch audit log' 
    });
  }
});

module.exports = router;
