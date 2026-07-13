export interface ValidationError {
  field: string;
  message: string;
}

export class SchemaValidationError extends Error {
  public errors: ValidationError[];
  public code = 'INVALID_INPUT_SCHEMA';

  constructor(errors: ValidationError[]) {
    super('Skema payload tidak valid sesuai kriteria enterprise!');
    this.errors = errors;
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

export class EnterpriseValidator {
  /**
   * Helper to check valid email
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Helper to check valid UID (Firebase length and structure)
   */
  public static isValidUid(uid: string): boolean {
    return typeof uid === 'string' && uid.trim().length >= 8 && uid.trim().length <= 128;
  }

  /**
   * Universal validate payload helper
   */
  public static validate(payload: Record<string, unknown>, schema: Record<string, 'email' | 'uid' | 'id' | 'amount' | 'currency' | 'role' | 'status' | 'string' | 'number' | 'boolean'>): void {
    const errors: ValidationError[] = [];

    for (const [field, type] of Object.entries(schema)) {
      const value = payload[field];

      if (value === undefined || value === null) {
        errors.push({ field, message: `Field '${field}' wajib diisi!` });
        continue;
      }

      switch (type) {
        case 'email':
          if (typeof value !== 'string' || !this.isValidEmail(value)) {
            errors.push({ field, message: `Field '${field}' harus berupa format email yang valid!` });
          }
          break;
        case 'uid':
          if (typeof value !== 'string' || !this.isValidUid(value)) {
            errors.push({ field, message: `Field '${field}' harus berupa UID pengguna yang valid!` });
          }
          break;
        case 'id':
          if (typeof value !== 'string' || value.trim().length === 0) {
            errors.push({ field, message: `Field '${field}' harus berupa identifier (string) yang valid!` });
          }
          break;
        case 'amount':
          if (typeof value !== 'number' || value < 0) {
            errors.push({ field, message: `Field '${field}' harus berupa angka finansial positif (>= 0)!` });
          }
          break;
        case 'currency':
          if (typeof value !== 'string' || !['IDR', 'USD', 'SAR'].includes(value.toUpperCase())) {
            errors.push({ field, message: `Field '${field}' harus berupa kode mata uang yang valid (IDR, USD, SAR)!` });
          }
          break;
        case 'role': {
          const allowedRoles = ['owner', 'admin', 'finance', 'operasional', 'vendor', 'mitra', 'jamaah', 'marketing', 'mutawif'];
          if (typeof value !== 'string' || !allowedRoles.includes(value.toLowerCase())) {
            errors.push({ field, message: `Field '${field}' harus berupa salah satu role yang valid!` });
          }
          break;
        }
        case 'status':
          if (typeof value !== 'string' || value.trim().length === 0) {
            errors.push({ field, message: `Field '${field}' harus berupa status string yang valid!` });
          }
          break;
        case 'string':
          if (typeof value !== 'string' || value.trim().length === 0) {
            errors.push({ field, message: `Field '${field}' harus berupa string yang tidak kosong!` });
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push({ field, message: `Field '${field}' harus berupa angka!` });
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({ field, message: `Field '${field}' harus berupa boolean!` });
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new SchemaValidationError(errors);
    }
  }
}
