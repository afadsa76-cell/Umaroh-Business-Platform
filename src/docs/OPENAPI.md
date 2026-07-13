# 🕋 UMAROH ERP - OpenAPI v1 Spec & Architecture Documentation

## 1. PENDAHULUAN & ARSITEKTUR KEAMANAN
Dokumen ini mendefinisikan standar API Governance, Middleware Keamanan, dan Matriks Otorisasi untuk platform **Umaroh Travel ERP (Enterprise Grade)**. 

Seluruh API menggunakan awalan `/api/v1/` guna mendukung siklus hidup rilis (API Lifecycle) yang profesional dan backward compatible.

---

## 2. STANDARD ENTERPRISE RESPONSE SCHEMA

### 2.1 Success Response Template (JSON)
Setiap transaksi yang berhasil mengembalikan payload JSON terstandarisasi.
```json
{
  "success": true,
  "data": { ... }
}
```

### 2.2 Error Response Template (JSON)
Error dikembalikan menggunakan format terpadu dengan ID korelasi unik (`requestId`) untuk kemudahan pelacakan di Google Cloud Logging.
```json
{
  "success": false,
  "code": "INVALID_INPUT_SCHEMA",
  "message": "Skema payload tidak valid sesuai kriteria enterprise!",
  "requestId": "2b6b23b4-ee18-49ee-8422-921471015f8a",
  "timestamp": "2026-07-09T10:07:06.140Z",
  "errors": [
    {
      "field": "email",
      "message": "Field 'email' harus berupa format email yang valid!"
    }
  ]
}
```

---

## 3. SECURITY GATEWAYS & RATE LIMITING

Setiap alamat IP dipetakan ke sliding-window limiter di memori untuk mencegah serangan Brute-Force dan DDoS:

| Endpoint | Window | Max Request | Error Code |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register-controlled-user` | 1 Menit | 10 | `REGISTER_RATE_LIMIT_EXCEEDED` |
| `/api/v1/auth/update-user-status` | 1 Menit | 15 | `LOGIN_RATE_LIMIT_EXCEEDED` |
| Transaksi Keuangan (S3 / Wallet) | 1 Menit | 30 | `PAYMENT_RATE_LIMIT_EXCEEDED` |

---

## 4. ROLE & PERMISSION MATRIX

Otorisasi menggunakan **Custom Claims** Firebase yang disinkronkan ke token JWT. 
Izin diperiksa di tingkat backend sebelum handler dipanggil:

| Izin (Permission) | Owner | Admin | Finance | Operasional | Vendor | Mitra | Jamaah |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `booking:create` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `booking:read` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `booking:update` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `booking:approve` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `finance:write` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `wallet:withdraw` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `visa:write` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `audit:read` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. API ENDPOINTS V1 SPECIFICATION

### 5.1 POST `/api/v1/auth/register-controlled-user`
Mendaftarkan pengguna yang dikendalikan oleh administrator (Jamaah, Agen, Mitra, dsb).
- **Authentication**: Bearer Token (Firebase ID Token)
- **Required Claims**: `owner` atau `admin`
- **Request Headers**:
  - `Authorization`: `Bearer <Token>`
  - `x-correlation-id`: `UUID` (Opsional)
- **Request Body**:
```json
{
  "email": "jamaah.baru@gmail.com",
  "namaLengkap": "Ahmad Dani",
  "role": "jamaah"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "uid": "usr_7894121a",
  "email": "jamaah.baru@gmail.com"
}
```

### 5.2 POST `/api/v1/auth/update-user-status`
Memperbarui status pengguna aktif/non-aktif/ditangguhkan.
- **Authentication**: Bearer Token (Firebase ID Token)
- **Required Claims**: `owner` atau `admin`
- **Request Body**:
```json
{
  "uid": "usr_7894121a",
  "status": "aktif"
}
```

---

## 6. OBSERVABILITY & GOOGLE CLOUD INTEGRATION

Arsitektur ini siap dideploy pada Google Cloud Run dan terintegrasi langsung dengan ekosistem Google Cloud Observability:

1. **Cloud Logging (Structured JSON)**
   Ketika `NODE_ENV=production` diaktifkan, seluruh log dicetak dalam bentuk JSON satu baris yang sesuai dengan spesifikasi Google Cloud Structured Logging. Log secara otomatis memuat payload tracing (`requestId`, `correlationId`, dan `traceId`) untuk pelacakan end-to-end.
   
2. **Cloud Error Reporting**
   Error dengan level `CRITICAL` atau `ERROR` otomatis ditangkap oleh agent Cloud Logging dan dikelompokkan ke dalam dashboard Cloud Error Reporting berdasarkan struktur stack-trace error.

3. **Cloud Monitoring Metric Dashboard**
   Sinyal emas (Golden Signals) seperti durasi response (`durationMs`), jumlah error (`5xx` rate), dan penolakan rate-limit (`429` rate) diekspor ke Cloud Monitoring untuk alert realtime.

---

## 7. CHEKLISP PENETRATION TESTING (API SECURITY COMPLIANCE)

Sebelum perilisan Sprint 2, pastikan checklisp ini terpenuhi dalam fase testing DevSecOps:
- [x] **No Anonymous API Exposure**: Seluruh rute `/api/v1/*` wajib dilewati oleh `authenticateMiddleware`.
- [x] **Strict Input Whitelisting**: Seluruh parameter wajib divalidasi kualifikasinya menggunakan `EnterpriseValidator` (bebas dari injeksi SQL / NoSQL).
- [x] **Token Revocation Check**: Middleware memvalidasi revocation token Firebase menggunakan parameter `forceRefresh = true`.
- [x] **Rate Limit Protections**: Seluruh endpoint sensitif (Auth, Transaksi) dilindungi oleh rate limiter sliding-window.
- [x] **Secret Hardcoding Audit**: Tidak boleh ada API Key, SMTP Password, Firebase SDK configuration, atau JWT Secret di dalam source code repository. Seluruhnya ditarik via variable environment yang di-inject dari Google Secret Manager.
