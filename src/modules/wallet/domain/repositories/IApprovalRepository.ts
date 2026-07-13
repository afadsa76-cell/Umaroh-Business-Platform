/**
 * @file IApprovalRepository.ts
 * @description Approval Repository interface defining port boundary with standard base operations.
 */

export interface IApprovalRequest {
  id: string;
  txId: string;
  makerId: string;
  checkerId?: string;
  approverId?: string;
  status: 'PENDING' | 'CHECKED' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
  deletedAt?: Date; // For softDelete support
}

export interface IApprovalRepository {
  // Existing operations
  createRequest(request: IApprovalRequest): Promise<void>;
  updateRequest(id: string, updates: Partial<Pick<IApprovalRequest, 'checkerId' | 'approverId' | 'status' | 'notes' | 'resolvedAt'>>): Promise<void>;
  getById(id: string): Promise<IApprovalRequest | null>;

  // Standard 10 operations required by Sprint 2B.2
  create(request: IApprovalRequest): Promise<void>;
  findById(id: string): Promise<IApprovalRequest | null>;
  findByReference(reference: string): Promise<IApprovalRequest[]>; // Matches txId
  findAll(): Promise<IApprovalRequest[]>;
  update(id: string, updates: Partial<IApprovalRequest>): Promise<void>;
  softDelete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  lock(id: string): Promise<void>;
  unlock(id: string): Promise<void>;
  count(): Promise<number>;
}
