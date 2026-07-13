/**
 * @file RiskValidator.ts
 * @description Validator class enforcing real-time velocity rate checks, client IP tracking, and fraud indicators.
 */

import { IValidationRule } from '../../application/validation/IValidationRule.js';
import { ValidationContext, ValidationStage } from '../../application/validation/ValidationContext.js';
import { IRiskValidator } from './IRiskValidator.js';
import { ValidationMetrics } from '../../application/validation/ValidationMetrics.js';

// Simple in-memory tracker for IP velocity rate checking (e.g., maximum 10 requests per minute from the same IP)
const ipRequestHistory: Map<string, number[]> = new Map();

export class RiskValidator implements IRiskValidator, IValidationRule {
  public readonly name = 'RiskValidator';
  public readonly stage = ValidationStage.RISK;

  private readonly metrics = ValidationMetrics.getInstance();

  /**
   * Validates transactional risk parameters, velocity rate limits, and fraud indicators.
   */
  public validate(context: ValidationContext): void {
    const req = context.request;

    // 1. Evaluate explicit Risk Score from upstream fraud engines or user data
    if (req.riskScore !== undefined) {
      if (req.riskScore > 80) {
        this.metrics.increment('risk.detected');
        context.addError(
          this.stage,
          this.name,
          `High Fraud Risk Blocked: Suspicious behavior detected with a risk score of ${req.riskScore}/100.`,
          'CRITICAL'
        );
        context.shortCircuit = true;
        return;
      } else if (req.riskScore > 50) {
        this.metrics.increment('risk.detected');
        context.addError(
          this.stage,
          this.name,
          `Elevated Risk Warning: Transaction under review (risk score: ${req.riskScore}/100).`,
          'WARNING'
        );
      }
    }

    // 2. Velocity Rate Check by Client IP (Max 10 requests per 10 seconds from the same IP to prevent bot attacks)
    const clientIp = req.clientIp || '127.0.0.1';
    const now = Date.now();
    
    let history = ipRequestHistory.get(clientIp);
    if (!history) {
      history = [];
      ipRequestHistory.set(clientIp, history);
    }

    // Filter out timestamps older than 10 seconds
    const tenSecondsAgo = now - 10000;
    history = history.filter(ts => ts > tenSecondsAgo);
    
    if (history.length >= 10) {
      this.metrics.increment('risk.detected');
      context.addError(
        this.stage,
        this.name,
        `Velocity Limit Breached: IP address ${clientIp} triggered rate limit (exceeded 10 transactions per 10 seconds).`,
        'ERROR'
      );
      return;
    }

    // Record this transaction's timestamp
    history.push(now);
    ipRequestHistory.set(clientIp, history);
  }
}
