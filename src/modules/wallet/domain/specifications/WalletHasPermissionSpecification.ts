/**
 * @file WalletHasPermissionSpecification.ts
 * @description Domain specification verifying if user attributes satisfy the required transaction permission.
 */

import { ISpecification } from './ISpecification.js';

export interface IUserAuthData {
  role?: string;
  permissions?: string[];
}

export class WalletHasPermissionSpecification implements ISpecification<IUserAuthData, string> {
  public isSatisfiedBy(candidate: IUserAuthData, requiredPermission?: string): boolean {
    if (!requiredPermission) return true;
    
    // Admin role bypasses all permission checks
    if (candidate.role?.toUpperCase() === 'ADMIN' || candidate.role?.toUpperCase() === 'SYSTEM') {
      return true;
    }

    if (!candidate.permissions) return false;
    return candidate.permissions.includes(requiredPermission);
  }
}
