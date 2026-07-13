/**
 * @file CommissionPolicy.ts
 * @description Domain Business Policy governing Commission operations.
 */

import { IPolicy } from './IPolicy.js';

export interface ICommissionParams {
  approved: boolean;
}

export class CommissionPolicy implements IPolicy<ICommissionParams, boolean> {
  /**
   * Evaluates if a commission is allowed to be credited.
   * "Commission harus Approved".
   */
  public evaluate(params: ICommissionParams): boolean {
    return params.approved === true;
  }
}
