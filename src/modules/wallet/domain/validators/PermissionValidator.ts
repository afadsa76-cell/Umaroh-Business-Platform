/**
 * @file PermissionValidator.ts
 * @description Validator class checking authentication, authorization, role, and operation permissions.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IPermissionValidator } from './IPermissionValidator.js';
import { WalletHasPermissionSpecification } from '../specifications/WalletHasPermissionSpecification.js';

export class PermissionValidator implements IPermissionValidator, IValidationRule {
  public readonly name = 'PermissionValidator';
  public readonly stage = ValidationStage.PERMISSION;
  
  private readonly permissionSpec = new WalletHasPermissionSpecification();

  /**
   * Validates if the request has the required JWT, role, claims, and transaction permissions.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;

    // 1. JWT validation
    if (req.jwt === undefined) {
      // If JWT is entirely missing, log an informational warning but don't fail unless it's a security-strict environment.
      // For safety, let's treat an empty JWT string as authentication failure.
      console.warn('[PermissionValidator] JWT is empty or undefined.');
    } else if (req.jwt.trim() === '') {
      context.addError(
        ValidationStage.AUTHENTICATION,
        this.name,
        'Authentication token (JWT) is empty or invalid.',
        'CRITICAL'
      );
      context.shortCircuit = true;
      return;
    }

    // 2. Role Authorization Check
    const allowedRoles = ['USER', 'MERCHANT', 'ADMIN', 'SYSTEM', 'SUPPORT'];
    if (req.role && !allowedRoles.includes(req.role.toUpperCase())) {
      context.addError(
        ValidationStage.AUTHORIZATION,
        this.name,
        `Role ${req.role} is unauthorized for financial transactions.`,
        'ERROR'
      );
      return;
    }

    // 3. Operational Permissions Mapping
    const operationToPermissionMap: Record<string, string> = {
      DEPOSIT: 'wallet.deposit',
      WITHDRAW: 'wallet.withdraw',
      TRANSFER: 'wallet.transfer',
      FREEZE: 'wallet.admin.freeze',
      RESERVE: 'wallet.reserve',
      SETTLEMENT: 'wallet.admin.settle',
      COMMISSION: 'wallet.credit.commission',
      REFUND: 'wallet.refund',
      ADJUSTMENT: 'wallet.admin.adjust'
    };

    const requiredPermission = operationToPermissionMap[req.operationType];
    const candidateAuth = {
      role: req.role,
      permissions: req.permissions
    };

    // If candidate does not satisfy the permission specification, fail the validation
    if (requiredPermission && !this.permissionSpec.isSatisfiedBy(candidateAuth, requiredPermission)) {
      context.addError(
        this.stage,
        this.name,
        `Permission Denied: Missing required permission '${requiredPermission}' for operation ${req.operationType}.`,
        'ERROR'
      );
    }

    // 4. Custom Claims Check
    if (req.customClaims) {
      if (req.customClaims.riskBlocked === true) {
        context.addError(
          ValidationStage.AUTHORIZATION,
          this.name,
          'Authorization blocked due to custom security risk claims.',
          'CRITICAL'
        );
        context.shortCircuit = true;
      }
    }
  }
}
