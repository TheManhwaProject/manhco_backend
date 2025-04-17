import { Router } from 'express';
import { authenticate, requireRoles, requireExactRoles } from '../../../middleware/authMiddleware';

const router = Router();

/**
 * Protected routes requiring authentication
 * 
 * All routes in this module require valid JWT authentication.
 * Some routes additionally require specific user roles or role hierarchy.
 */

// Route accessible only to users with admin role (exact match required)
router.get('/admin-dashboard', authenticate, requireExactRoles(['admin']), (req, res) => {
  res.status(200).json({
    message: 'Admin dashboard data retrieved successfully',
    user: req.user
  });
});

// Route accessible to moderators and any higher role (admin, super_admin)
router.get('/moderation', authenticate, requireRoles(['moderator']), (req, res) => {
  res.status(200).json({
    message: 'Moderation data retrieved successfully',
    user: req.user
  });
});

// Route accessible to editors and any higher role (moderator, admin, super_admin)
router.get('/editor-tools', authenticate, requireRoles(['editor']), (req, res) => {
  res.status(200).json({
    message: 'Editor tools accessed successfully',
    user: req.user
  });
});

// Route that requires multiple possible roles without hierarchy
router.get('/special-access', authenticate, requireExactRoles(['user', 'editor']), (req, res) => {
  res.status(200).json({
    message: 'Special access granted',
    user: req.user
  });
});

export default router; 