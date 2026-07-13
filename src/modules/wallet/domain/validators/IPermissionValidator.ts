/**
 * @file IPermissionValidator.ts
 * @description Boundary interface for authorization, roles, custom claims, and permission matrix checks.
 */

import { ValidationContext } from '../../application/validation/ValidationContext.js';

export interface IPermissionValidator {
  /**
   * Validates user roles, permissions, and claims against the required permission matrix for the operation.
   */
  validate(context: ValidationContext): Promise<void> | void;
}
