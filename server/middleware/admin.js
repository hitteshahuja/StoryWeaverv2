const pool = require('../db/pool');

/**
 * Admin authorization middleware
 * Verifies that the authenticated user's email is in the ADMIN_EMAILS environment variable
 * Must be chained after requireAuth middleware
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Ensure user is authenticated (should be handled by requireAuth middleware)
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required.' 
      });
    }

    const clerkId = req.auth.userId;

    // Query database to get user's email
    const result = await pool.query(
      'SELECT email FROM users WHERE clerk_id = $1',
      [clerkId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'User not found in database.' 
      });
    }

    const userEmail = result.rows[0].email;

    if (!userEmail) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'User email not available.' 
      });
    }

    // Get admin emails from environment variable
    const adminEmailsEnv = process.env.ADMIN_EMAILS;

    if (!adminEmailsEnv) {
      console.error('[Admin Middleware] ADMIN_EMAILS environment variable not configured');
      return res.status(500).json({ 
        error: 'Configuration Error', 
        message: 'Admin authorization not configured.' 
      });
    }

    // Parse comma-separated admin emails and trim whitespace
    const adminEmails = adminEmailsEnv.split(',').map(email => email.trim().toLowerCase());

    // Check if user's email is in the admin list
    if (!adminEmails.includes(userEmail.toLowerCase())) {
      console.warn(`[Admin Middleware] Unauthorized admin access attempt by ${userEmail}`);
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'You do not have permission to access this resource.' 
      });
    }

    // User is authorized as admin - attach email to request for audit logging
    req.adminEmail = userEmail;

    next();
  } catch (error) {
    console.error('[Admin Middleware Error]', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'An error occurred while verifying admin authorization.' 
    });
  }
};

module.exports = { requireAdmin };
