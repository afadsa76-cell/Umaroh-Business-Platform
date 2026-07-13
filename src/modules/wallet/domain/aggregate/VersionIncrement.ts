/**
 * @file VersionIncrement.ts
 * @description Domain utility to safely increment an AggregateVersion.
 */

import { AggregateVersion } from './AggregateVersion.js';

export class VersionIncrement {
  public static increment(version: AggregateVersion): AggregateVersion {
    return version.next();
  }
}
