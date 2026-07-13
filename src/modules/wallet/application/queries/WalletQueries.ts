/**
 * @file WalletQueries.ts
 * @description CQRS Query definitions representing intent to fetch read models.
 * @responsibility Port defining read-only querying commands.
 */

export class GetWalletQuery {
  constructor(public readonly uid: string) {}
}

export class GetWalletHistoryQuery {
  constructor(
    public readonly uid: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0
  ) {}
}

export class GetLedgerBalancesQuery {
  constructor(public readonly coaCode: string) {}
}
