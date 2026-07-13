/**
 * @file WalletCommands.ts
 * @description CQRS Command definitions representing intent to mutate state.
 * @responsibility Port defining state-mutation request commands.
 */

import { DepositRequestDTO, WithdrawRequestDTO, TransferRequestDTO } from '../dto/WalletDTO.js';

export class CreateWalletCommand {
  constructor(
    public readonly uid: string,
    public readonly tenantId: string,
    public readonly organizationId: string,
    public readonly currency: string
  ) {}
}

export class DepositCommand {
  constructor(public readonly data: DepositRequestDTO) {}
}

export class WithdrawCommand {
  constructor(public readonly data: WithdrawRequestDTO) {}
}

export class TransferCommand {
  constructor(public readonly data: TransferRequestDTO) {}
}

export class FreezeWalletCommand {
  constructor(
    public readonly uid: string,
    public readonly reason: string
  ) {}
}
