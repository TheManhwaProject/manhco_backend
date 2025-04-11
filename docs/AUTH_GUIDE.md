# Authentication System Guide

This guide explains how to use the JWT-based authentication system with Google OAuth in your application.

## Authentication Flow

1. **Initial Authentication**: Users authenticate via Google OAuth
2. **Token Generation**: Server generates JWT access tokens (30 min) and refresh tokens (30 days)
3. **Token Usage**: Client includes access token in Authorization header for API calls
4. **Token Refresh**: Client refreshes expired tokens using refresh endpoint
5. **Logout**: Client invalidates tokens on logout

## API Endpoints

### Authentication

- `GET /api/v1/auth/google` - Initiates Google OAuth authentication
- `GET /api/v1/auth/google/callback` - OAuth callback URL (not directly called by client)
- `POST /api/v1/auth/refresh` - Refresh access token using refresh token cookie
- `POST /api/v1/auth/logout` - Log out user and invalidate token
- `GET /api/v1/auth/me` - Get current authenticated user data
- `GET /api/v1/auth/csrf-token` - Get CSRF token for protected requests

### Protected Routes

All API routes requiring authentication should use the `authenticate` middleware:

```javascript
import { authenticate } from '../../../middleware/authMiddleware';

router.get('/protected-route', authenticate, (req, res) => {
  // Access authenticated user via req.user
});
```

## Role-Based Access Control

The system supports a hierarchical role system with the following roles (from lowest to highest priority):

1. `user` - Regular user (default)
2. `editor` - Content editor
3. `moderator` - Content moderator
4. `admin` - Administrator
5. `super_admin` - Super administrator

### Role Middleware

Two types of role-based middleware are available:

#### 1. Exact Role Matching

```javascript
import { requireExactRoles } from '../../../middleware/authMiddleware';

// Only users with EXACTLY the 'admin' role can access this route
router.get('/admin-only', authenticate, requireExactRoles(['admin']), (req, res) => {
  // Admin-only logic
});

// Users with EITHER 'user' OR 'editor' roles can access this route
router.get('/users-or-editors', authenticate, requireExactRoles(['user', 'editor']), (req, res) => {
  // Logic for users or editors
});
```

#### 2. Hierarchical Role Matching

```javascript
import { requireRoles } from '../../../middleware/authMiddleware';

// Users with 'moderator' role OR ANY HIGHER ROLE (admin, super_admin) can access this route
router.get('/moderator-or-higher', authenticate, requireRoles(['moderator']), (req, res) => {
  // Logic for moderators or higher roles
});
```

## CSRF Protection

The API includes CSRF protection for all state-changing requests (POST, PUT, DELETE):

1. Get a CSRF token from the server: `GET /api/v1/auth/csrf-token`
2. Include the token in the `X-CSRF-Token` header for all state-changing requests

```javascript
// Example frontend code
const { csrfToken } = await fetch('/api/v1/auth/csrf-token').then(res => res.json());

// Use the token in subsequent requests
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'X-CSRF-Token': csrfToken
  }
});
```

## Token Storage

- **Access Token**: Store in memory (not in localStorage/sessionStorage for security)
- **Refresh Token**: Automatically stored as HttpOnly cookie by the server

## Security Considerations

- Access tokens are short-lived (30 minutes) to minimize risk if compromised
- Refresh tokens are stored as HttpOnly cookies to protect against XSS attacks
- CSRF protection is implemented for all state-changing requests
- Token rotation is implemented for refresh tokens to prevent token reuse
- All security-sensitive operations include proper error handling and validation 