/**
 * @file IPolicy.ts
 * @description Domain Business Policy interface.
 */

export interface IPolicy<T, R = boolean> {
  /**
   * Evaluates the domain policy against the target input.
   */
  evaluate(target: T): R | Promise<R>;
}
