/**
 * Role Utilities
 * 
 * This module defines role hierarchy and provides utilities for role-based authorization:
 * - Role definitions with priority levels
 * - Role comparison functions to check if one role has higher or equal privileges
 * - Role validation functions
 */

// Define role hierarchy (higher number = higher priority)
export const ROLES = {
  USER: { name: 'user', priority: 1 },
  EDITOR: { name: 'editor', priority: 2 },
  MODERATOR: { name: 'moderator', priority: 3 },
  ADMIN: { name: 'admin', priority: 4 },
  SUPER_ADMIN: { name: 'super_admin', priority: 5 }
};

// Role type for type safety
export type RoleName = keyof typeof ROLES;
export type Role = typeof ROLES[RoleName];

/**
 * Get role object by name
 * 
 * @param roleName - Name of the role to retrieve
 * @returns Role object with name and priority or undefined if not found
 */
export const getRoleByName = (roleName: string): Role | undefined => {
  const roleEntry = Object.entries(ROLES).find(
    ([, role]) => role.name === roleName.toLowerCase()
  );
  
  return roleEntry ? roleEntry[1] : undefined;
};

/**
 * Check if a role has equal or higher priority than a required role
 * 
 * @param userRole - User's role name
 * @param requiredRole - Required role name for access
 * @returns True if user's role has equal or higher priority
 */
export const hasRoleOrHigher = (userRole: string, requiredRole: string): boolean => {
  const userRoleObj = getRoleByName(userRole);
  const requiredRoleObj = getRoleByName(requiredRole);
  
  if (!userRoleObj || !requiredRoleObj) {
    return false;
  }
  
  return userRoleObj.priority >= requiredRoleObj.priority;
};

/**
 * Check if a role is included in a list of allowed roles (by name or by priority)
 * 
 * @param userRole - User's role name
 * @param allowedRoles - Array of allowed role names
 * @param checkHigherPriority - If true, check if user's role has higher priority than any allowed role
 * @returns True if user's role is allowed
 */
export const isRoleAllowed = (
  userRole: string, 
  allowedRoles: string[], 
  checkHigherPriority = false
): boolean => {
  // Exact match check
  if (allowedRoles.includes(userRole)) {
    return true;
  }
  
  // Higher priority check
  if (checkHigherPriority) {
    return allowedRoles.some(role => hasRoleOrHigher(userRole, role));
  }
  
  return false;
};

/**
 * Validate if a role exists in the system
 * 
 * @param roleName - Role name to validate
 * @returns True if role exists
 */
export const isValidRole = (roleName: string): boolean => {
  return !!getRoleByName(roleName);
}; 