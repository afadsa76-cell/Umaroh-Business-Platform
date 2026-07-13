/**
 * @file ISpecification.ts
 * @description Core DDD Specification Pattern interface.
 */

export interface ISpecification<T, C = undefined> {
  /**
   * Evaluates if the candidate satisfies the specification under the optional context.
   */
  isSatisfiedBy(candidate: T, context?: C): boolean | Promise<boolean>;
}
