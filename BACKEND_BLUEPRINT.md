# UMAROH TRAVEL ERP PLATFORM - BACKEND ENTERPRISE ARCHITECTURE BLUEPRINT
## DOKUMENTASI STRATEGIS & ACUAN MIGRASI SISTEM KE SERVERLESS BACKEND
**Edisi:** Enterprise Gold Release (Q3 2026)  
**Disusun Oleh:** Senior Technical Architect, Firebase Enterprise Specialist & Lead Documentation Engineer  
**Klasifikasi:** CONFIDENTIAL / DEVELOPMENT ACUAN UTAMA  

---

## DAFTAR ISI
1. [BAB 1: Current Backend Architecture Analysis](#1-current-backend-architecture-analysis)
2. [BAB 2: Backend Service Mapping](#2-backend-service-mapping)
3. [BAB 3: Cloud Functions Roadmap](#3-cloud-functions-roadmap)
4. [BAB 4: Business Logic Migration Plan](#4-business-logic-migration-plan)
5. [BAB 5: Security Blueprint](#5-security-blueprint)
6. [BAB 6: Backend Folder Structure](#6-backend-folder-structure)
7. [BAB 7: Cloud Function Naming Standard](#7-cloud-function-naming-standard)
8. [BAB 8: Collection Ownership Matrix](#8-collection-ownership-matrix)
9. [BAB 9: Recommended API Design (Express Backend)](#9-recommended-api-design-express-backend)
10. [BAB 10: Migration Strategy (Strangler Fig Pattern)](#10-migration-strategy-strangler-fig-pattern)
11. [Prioritas Implementasi Cloud Functions](#prioritas-implementasi-cloud-functions)

---

## 1. CURRENT BACKEND ARCHITECTURE ANALYSIS

Saat ini, platform SaaS Umaroh masih mengandalkan pola arsitektur **Fat-Client** (Frontend-Centric), di mana mayoritas aturan logika bisnis (*business logic*) dijalankan secara langsung pada aplikasi klien (React) melalui Firestore Client SDK. Meskipun pola ini memberikan kemudahan di awal, ia memiliki kelemahan kritis dari segi keamanan (*security*), performa (*performance*), dan konsistensi data transaksional (*atomic consistency*).

### A. Analisa Business Logic yang Masih Berada di Frontend:
* **Proses Aktivasi Akun & Sinkronisasi Profile:** Klien memindai `pre_users` melalui kueri email, melakukan registrasi, lalu mengeksekusi `runTransaction` di frontend untuk menyalin dokumen ke `users` dan membuat `wallets`.
* **Kalkulasi Komisi Keagenan (Multi-tier MLM):** Ketika administrator memvalidasi pembayaran paket umroh jemaah di panel admin, kode frontend menghitung persentase bonus mitra dan bonus upline mitra, kemudian menulis penyesuaian saldo ke dokumen `wallets` masing-masing penerima secara langsung.
* **Manajemen Alokasi Kuota Kamar Hotel & Kursi Maskapai (Stock Locking):** Klien mengurangi nilai kuota kamar hotel secara langsung di collection `master_hotels` saat proses pemesanan diverifikasi.
* **Validasi Validitas Transaksi Penarikan (Withdrawal Check):** Mitra mengajukan penarikan, dan klien memeriksa apakah nominal yang ditarik melebihi sisa saldo dompet yang tersedia.

### B. Pembagian Tanggung Jawab (Separation of Concerns):

#### 1. Sektor yang Boleh Tetap Berada di Sisi Klien (Frontend Client-Side):
* **Visualisasi & State Management UI:** Penyajian data real-time menggunakan listener `onSnapshot` Firestore untuk memperbarui grafik Recharts dan data tabel jemaah.
* **Validasi Formulir Front-End:** Validasi kebenaran input (seperti kelayakan karakter email, minimal panjang kata sandi, validasi ukuran file paspor yang diupload) sebelum mengirim request ke backend.
* **Local Persistence Prefs:** Penyimpanan state tema visual (dark/light) dan preferensi filter pencarian lokal di browser (`localStorage`).

#### 2. Sektor yang Wajib Dipindahkan ke Sisi Server (Backend Server-Side / Cloud Functions):
* **Modifikasi Kritis Dompet Digital (Wallets & Transactions):** Segala bentuk penulisan, penambahan, dan pengurangan saldo keuangan wajib diisolasi di server tanpa izin penulisan langsung dari klien.
* **Provisi Pengguna & Hak Akses (User Creation & Role Claims):** Pendaftaran user baru, pembagian Custom Claims JWT Firebase Auth (admin, finance, mitra, vendor) wajib ditangani oleh backend menggunakan Firebase Admin SDK.
* **Alokasi Kuota & Stok (Atomic Procurement):** Pengurangan kuota kursi pesawat atau kamar hotel wajib dilakukan di server dengan jaminan transaction locking untuk mencegah *overselling*.
* **API Pihak Ketiga & Rahasia (Secret Keys Proxy):** Gateway pembayaran, pengiriman pesan WhatsApp, dan kueri kecerdasan buatan Gemini AI.

### C. Diagram Aliran Data Saat Ini (Current Fat-Client) vs Arsitektur Target (Target Thin-Client):

#### Aliran Saat Ini (Fat-Client - Kurang Aman):
```
┌──────────────┐
│  Client App  │───(Hitung Komisi, Validasi Stok, Provisi Akun)───┐
└──────────────┘                                                    │
       │                                                            ▼
       ▼                                                     ┌──────────────┐
(Tulis Data Langsung)───────────────────────────────────────►│  Firestore   │
                                                             └──────────────┘
```

#### Arsitektur Target (Thin-Client - Secure & Scalable):
```
┌──────────────┐             Secure HTTPS Call / Triggers            ┌──────────────────┐
│  Client App  │────────────────────────────────────────────────────►│ Cloud Functions  │
└──────────────┘                                                     │ (Admin SDK Engine│
       ▲                                                             └────────┬─────────┘
       │                                                                      │
       │                                                                      │ (Atomic Database Write)
       │ Real-time Synchronization (onSnapshot Only)                          ▼
       └─────────────────────────────────────────────────────────────┌──────────────────┐
                                                                     │    Firestore     │
                                                                     └──────────────────┘
```

---

## 2. BACKEND SERVICE MAPPING

Tabel di bawah ini memetakan seluruh modul operasional SaaS Umaroh ke dalam target lokasi backend barunya demi menjamin keamanan dan performa:

| Nama Layanan / Service | Lokasi Saat Ini | Lokasi Arsitektur Baru | Status Migrasi | Prioritas |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Profile Provisioning** | Frontend (`LoginView.tsx`, `UserDatabaseView.tsx`) | Express API / Cloud Functions (Admin SDK) | Proposed Blueprint | **P1 - CRITICAL** |
| **Wallet Adjustments & Ledger Records** | Frontend (`UserDatabaseView.tsx`) | Cloud Functions (HTTPS Callable with transactions) | Proposed Blueprint | **P1 - CRITICAL** |
| **Commission Calculations (Multi-tier MLM)** | Frontend (`UserDatabaseView.tsx`) | Firebase Firestore Triggers (`onUpdate` bookings) | Proposed Blueprint | **P1 - CRITICAL** |
| **Withdrawal Approvals (Disbursement)** | Frontend (`UserDatabaseView.tsx`) | Cloud Functions (HTTPS Callable with Auth Guard) | Proposed Blueprint | **P2 - HIGH** |
| **Booking Creation & Pricing Validation** | Frontend (`KatalogPaketView.tsx`) | Cloud Functions (HTTPS Callable with pricing verification) | Proposed Blueprint | **P2 - HIGH** |
| **Vendor Allocation & Quota Management** | Frontend (`VendorView.tsx`) | Firebase Firestore Triggers (`onUpdate` bookings) | Proposed Blueprint | **P2 - HIGH** |
| **Audit Log Trail Logging** | Frontend (`UserDatabaseView.tsx` - logs) | Firebase Firestore Triggers (Global Write Audits) | Proposed Blueprint | **P2 - HIGH** |
| **Instant Passenger Login (Booking Code)** | Frontend / LocalStorage (`LoginView.tsx`) | Cloud Functions (HTTPS Callable returning JWT/Auth Session) | Proposed Blueprint | **P2 - HIGH** |
| **Logistics Tracking (Koper & Cargo)** | Frontend (`MitraTrackerView.tsx`) | Firebase Firestore Triggers (`onCreate` bookings) | Proposed Blueprint | **P3 - MEDIUM** |
| **Gemini AI Marketing Copywriting** | Express Backend (`server.ts`) | Isolated API Route / Cloud Functions | Partially Implemented | **P3 - MEDIUM** |
| **Reports & Excel Document Exports** | Frontend Client-Side SheetJS | Express API / Cloud Functions (Server-side stream) | Proposed Blueprint | **P3 - MEDIUM** |

---

## 3. CLOUD FUNCTIONS ROADMAP

Kelompok Cloud Functions dirancang secara modular dan terbagi dalam beberapa kategori strategis:

### A. Kategori: AUTH (Autentikasi & Otorisasi)
* **Tujuan:** Menghapus celah pendaftaran tidak sah di frontend dan menjamin perizinan berbasis Custom Claims.
* **Trigger:** HTTPS Callable Function (`apiRegisterControlledUser`).
* **Output:** Akun Firebase Auth baru dengan Custom Claims role terkait terdaftar, dan status target di `pre_users` dimigrasikan menjadi "activated".
* **Collection Terpakai:** `users`, `pre_users`, `pendaftaran_mitra`.

### B. Kategori: WALLET (Dompet Mitra & Keuangan)
* **Tujuan:** Manajemen mutasi dompet digital mitra, penarikan dana, dan penambahan bonus komisi tanpa manipulasi.
* **Trigger:** HTTPS Callable Function (`apiProcessWalletWithdrawal`) dan Firestore Trigger (`onBookingPaymentConfirmed`).
* **Output:** Mutasi data saldo wallet berkurang/bertambah secara aman dan dokumen riwayat transaksi dibuat di collection `transactions`.
* **Collection Terpakai:** `wallets`, `transactions`, `bookings`.

### C. Kategori: BOOKING (Alur Pemesanan & Manifest)
* **Tujuan:** Validasi manifest, penetapan invoice perjalanan, dan pengamanan pemesanan paket umroh.
* **Trigger:** HTTPS Callable Function (`apiCreateSecureBooking`).
* **Output:** Dokumen `bookings` terbentuk dengan validasi harga dari backend, bukan dari input harga frontend.
* **Collection Terpakai:** `bookings`, `paket_master`, `paket_mitra`.

### D. Kategori: VENDOR (Pengadaan & Alokasi Kuota)
* **Tujuan:** Pembaruan kuota hotel dan tiket pesawat jemaah secara otomatis saat transaksi booking disetujui.
* **Trigger:** Firestore Document Update Trigger (`onBookingStatusChanged`).
* **Output:** Pengurangan otomatis properti `kuota` di data hotel atau maskapai, serta pembentukan manifest vendor.
* **Collection Terpakai:** `master_hotels`, `maskapai`, `bookings`.

### E. Kategori: NOTIFICATION (Sistem Pemberitahuan Pintar)
* **Tujuan:** Mengirimkan pesan notifikasi transaksi, konfirmasi pembayaran, dan detail logistik bagasi.
* **Trigger:** Firestore Document Create Trigger (`onNotificationCreated`).
* **Output:** Pengiriman email/WhatsApp melalui integrasi API pihak ketiga (Gateway).
* **Collection Terpakai:** `notifications`.

### F. Kategori: AUDIT (Jejak Rekam Jejak Sistem)
* **Tujuan:** Mencatat sejarah perubahan operasional sensitif (perubahan data paket atau otorisasi user) demi kepatuhan sistem.
* **Trigger:** Firestore Write Trigger (`onCriticalWriteDetected`).
* **Output:** Pembuatan dokumen log audit read-only.
* **Collection Terpakai:** `package_cost_audit_logs`, `system_blueprint_nodes`.

---

## 4. BUSINESS LOGIC MIGRATION PLAN

Peta jalan evakuasi logika bisnis dari Frontend ke Cloud Backend:

| Nama Logika Bisnis | Lokasi Frontend Saat Ini | Target Lokasi Baru di Backend | Prioritas Migrasi | Estimasi Risiko & Mitigasi |
| :--- | :--- | :--- | :--- | :--- |
| **Aktivasi Pre-Users** | `LoginView.tsx` (Transaction) | `apiActivatePreUser` (Callable Cloud Function) | **P1 (Mendesak)** | **Tinggi (Delay Auth)**: Terjadi jeda sinkronisasi Auth Token. *Mitigasi:* Gunakan Force Refresh Auth Token pada klien setelah aktivasi sukses. |
| **Pembagian Komisi MLM** | `UserDatabaseView.tsx` | `onPaymentApprovedDistribution` (Firestore Trigger) | **P1 (Mendesak)** | **Sangat Tinggi (Double Credit)**: Fungsi terpicu berulang. *Mitigasi:* Implementasikan kunci idempotensi (*Idempotency Key*) berbasis Booking ID pada transaksi wallet. |
| **Persetujuan Penarikan (WD)** | `UserDatabaseView.tsx` | `apiApproveWithdrawal` (Callable Cloud Function) | **P2 (Tinggi)** | **Sedang**: Saldo berkurang namun proses transfer gagal. *Mitigasi:* Gunakan transaksi database ACID; set status "approved" hanya setelah respons API bank sukses. |
| **Locking Kuota Hotel & Seat** | `KatalogPaketView.tsx` | `onBookingConfirmedLockStock` (Firestore Trigger) | **P2 (Tinggi)** | **Sedang (Overselling)**: Dua jemaah memesan kursi terakhir bersamaan. *Mitigasi:* Gunakan Firestore Transaction Lock pada dokumen hotel/maskapai. |
| **AI Copywriter Generation** | `server.ts` (API route) | `/api/v1/ai/generate-copy` (Callable / Endpoint) | **P3 (Rendah)** | **Sangat Rendah**: Latensi respon API Gemini. *Mitigasi:* Implementasikan UI loading indicator dengan efek shimmer yang bersahabat. |

---

## 5. SECURITY BLUEPRINT

Keamanan platform Umaroh SaaS harus ditingkatkan secara radikal dengan menerapkan konsep **Zero-Trust Security** pada level database dan infrastruktur server:

### A. Authentication & Custom Claims
Peran otorisasi (*Role-based access control*) tidak boleh bergantung pada properti dokumen Firestore yang dapat dibaca-tulis di sisi klien. Peran tersebut harus disematkan pada Firebase Custom Claims di dalam JWT token autentikasi.

```ts
// Contoh Penerapan Claims Server-Side melalui Admin SDK
admin.auth().setCustomUserClaims(uid, {
  role: 'finance',
  tenantId: 'umaroh_saas_tenant_1'
});
```
Klien akan mengirimkan JWT token ini pada setiap request, dan server memverifikasi secara instan tanpa perlu membaca dokumen Firestore berulang kali.

### B. Firestore Security Rules Blueprint
Struktur aturan keamanan Firestore (`firestore.rules`) harus diperbarui untuk membatasi akses tulis langsung dari sisi klien. Seluruh akses tulis krusial didelegasikan sepenuhnya ke Cloud Functions.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return request.auth.token.role;
    }
    
    // Aturan untuk Collection Users
    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || getUserRole() == 'admin');
      allow write: if false; // Tulis hanya boleh dilakukan oleh Admin SDK / Server-side
    }
    
    // Aturan untuk Collection Wallets
    match /wallets/{walletId} {
      allow read: if isSignedIn() && (request.auth.uid == walletId || getUserRole() == 'finance');
      allow write: if false; // Klien dilarang keras mengubah saldo secara langsung!
    }
    
    // Aturan untuk Master Hotels
    match /master_hotels/{hotelId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && (getUserRole() == 'admin' || getUserRole() == 'operasional');
    }
  }
}
```

### C. Storage Security Rules Blueprint
Mencegah jemaah melihat dokumen rahasia jemaah lain (seperti scan KTP/Paspor):

```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /jamaah_documents/{bookingId}/{allPaths=**} {
      allow read: if request.auth != null && (
        request.auth.token.role == 'admin' || 
        request.auth.token.role == 'operasional' ||
        resource.metadata.ownerUid == request.auth.uid
      );
      allow write: if request.auth != null;
    }
  }
}
```

---

## 6. BACKEND FOLDER STRUCTURE

Rencana visualisasi tata letak repositori Cloud Functions yang modular, bersih, dan mendukung skalabilitas jangka panjang:

```
functions/
├── src/
│   ├── auth/                      # Modul Manajemen Autentikasi & Akun
│   │   ├── apiRegisterUser.ts     # Endpoint provisi akun baru
│   │   └── apiActivatePreUser.ts  # Alur migrasi pre_users ke users
│   ├── wallet/                    # Modul Dompet Digital & Keuangan
│   │   ├── apiProcessWithdraw.ts  # Pengajuan penarikan dana mitra
│   │   └── onPaymentApproved.ts   # Trigger pembagian komisi bertingkat
│   ├── booking/                   # Modul Transaksi Pemesanan & Manifest
│   │   ├── apiCreateBooking.ts    # Pembuatan booking & tiket terverifikasi
│   │   └── onStatusChanged.ts     # Trigger logistik & stok hotel
│   ├── vendor/                    # Modul Procurement & Manajemen Vendor
│   │   └── apiSyncVendorQuota.ts  # Penguncian kuota kursi & kamar hotel
│   ├── utils/                     # Fungsi Pembantu (Helpers)
│   │   ├── security.ts            # Validasi Custom Claims & Verifikasi JWT
│   │   └── idempotency.ts         # Pencegah transaksi finansial ganda
│   ├── shared/                    # TypeScript Interfaces & Enums Bersama
│   │   └── types.ts               # Skema data modular (sync dengan client)
│   └── index.ts                   # Entry point utama ekspor seluruh fungsi
├── package.json                   # Dependensi backend (firebase-admin, tsx, dll.)
├── tsconfig.json                  # Konfigurasi compiler TypeScript backend
└── firestore.rules                # File aturan keamanan Firestore (deploy target)
```

---

## 7. CLOUD FUNCTION NAMING STANDARD

Penerapan standar penamaan CamelCase yang konsisten memudahkan identifikasi tipe trigger dan fungsionalitas modul secara cepat:

| Pola Naming / Pattern | Contoh Fungsi Backend | Tipe Trigger | Keterangan Operasional |
| :--- | :--- | :--- | :--- |
| `api[Modul][Aksi]` | `apiAuthRegisterUser` | HTTPS Callable | Dipanggil langsung oleh frontend untuk membuat user baru. |
| `api[Modul][Aksi]` | `apiWalletRequestWithdraw` | HTTPS Callable | Dipanggil oleh mitra untuk mengajukan pencairan komisi. |
| `on[Subject][Trigger]` | `onBookingCreatedInitTracker` | Firestore onCreate | Terpicu otomatis saat dokumen booking baru dibuat untuk membuat entri pelacakan logistik. |
| `on[Subject][Trigger]` | `onPaymentApprovedCalcCommission`| Firestore onUpdate | Terpicu otomatis saat pembayaran booking di-approve untuk membagi bonus upline. |
| `authOn[Event]` | `authOnUserDeletedCleanProfile` | Auth onDelete | Terpicu otomatis ketika akun Auth dihapus untuk membersihkan sisa database. |

---

## 8. COLLECTION OWNERSHIP MATRIX

Matriks otorisasi CRUD (*Create, Read, Update, Delete*) pada seluruh collection Firestore utama Umaroh ERP:

| Nama Collection | Created By (C) | Read By (R) | Updated By (U) | Deleted By (D) |
| :--- | :--- | :--- | :--- | :--- |
| **users** | Server-side (API/Functions) | Pemilik UID & Admin Utama | Pemilik UID (profil) / Admin | System-Only (Soft Delete) |
| **pre_users** | Admin Utama (Database) | Admin & Calon User (Sign up) | Server-side (set "activated") | Admin Utama |
| **wallets** | Server-side (Auto-Init) | Pemilik Dompet & Finance | Server-side (Strictly No Client)| Forbidden |
| **bookings** | Mitra & Jamaah (Pemesanan) | Pemilik Booking, Admin, Finance| Finance (Approval) & Operasional | Forbidden |
| **transactions**| Server-side (Wallet ledger) | Pemilik Dompet & Finance | Forbidden (Immutable Records) | Forbidden |
| **master_hotels**| Operasional & Vendor | Semua Pengguna (Katalog) | Operasional, Admin, Vendor | Admin Utama |
| **system_blueprint_nodes**| Admin Utama | Semua Internal Staff (ERP) | Admin Utama | Forbidden |

---

## 9. RECOMMENDED API DESIGN (EXPRESS BACKEND)

Rancangan arsitektur endpoint Express REST API internal apabila ke depan SaaS Umaroh memilih untuk menggabungkan API dalam satu container server Express monolitik (seperti pada `server.ts` yang sudah ada):

### A. Endpoint Kelompok: `/api/v1/auth/*`
* **POST `/api/v1/auth/provision-user`**
  * *Otorisasi:* Admin Only (Verify JWT + Claim: Admin)
  * *Deskripsi:* Membuat akun Firebase Auth baru dan mendaftarkan dokumen data calon user di collection `pre_users`.
* **POST `/api/v1/auth/activate-profile`**
  * *Otorisasi:* Public Sign-In (Verify JWT)
  * *Deskripsi:* Memindahkan profil dari `pre_users` ke `users/{uid}` secara atomis dan membuat dompet `wallets/{uid}`.

### B. Endpoint Kelompok: `/api/v1/wallet/*`
* **POST `/api/v1/wallet/request-withdrawal`**
  * *Otorisasi:* Mitra Only (Verify JWT + Claim: Mitra)
  * *Deskripsi:* Membaca nominal pengajuan, memvalidasi sisa saldo dompet, dan mencatat transaksi withdrawal pending di `transactions`.
* **PATCH `/api/v1/wallet/approve-withdrawal`**
  * *Otorisasi:* Finance Only (Verify JWT + Claim: Finance)
  * *Deskripsi:* Mengubah status transaksi menjadi "approved" dan memotong saldo wallet target secara aman di server side.

### C. Endpoint Kelompok: `/api/v1/booking/*`
* **POST `/api/v1/booking/verify-booking-code`**
  * *Otorisasi:* No Auth Required (Public)
  * *Deskripsi:* Lookup instan kode booking jemaah untuk akses masuk instan tanpa akun (kembali mengamankan properti bookings).

---

## 10. MIGRATION STRATEGY (STRANGLER FIG PATTERN)

Untuk menjamin bisnis operasional agen perjalanan Haji dan Umroh tetap berjalan lancar tanpa ada waktu henti (*Zero Downtime*), migrasi dari frontend logic menuju backend logic harus mengikuti tahapan aman di bawah ini:

```
┌────────────────────────────────────────────────────────────────────────┐
│  FASE 1: DUAL-WRITE & SHADOW RUN                                       │
│  Tulis data di Client, jalankan verifikasi Cloud Function di latar.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Uji Stabilitas & Konsistensi Data)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FASE 2: GATEKEEPER LOCKDOWN                                           │
│  Tutup Firebase Rules untuk Client-Write; alihkan rute penuh ke API.   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Zero Client-Side Manipulations)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FASE 3: FRONTEND CLEANUP & DEPRECATION                                │
│  Hapus logika transaksi di klien; frontend murni bertindak sebagai UI.  │
└────────────────────────────────────────────────────────────────────────┘
```

### Langkah Strategis Pengalihan Aliran Data:
1. **Penerapan Dual-Write (Fase 1):** Sisi klien tetap menjalankan transaksi penulisan wallet dan komisi, namun secara paralel memanggil Cloud Function shadow helper untuk memvalidasi akurasi perhitungan. Log error dicatat ke Firestore jika ditemukan diskrepansi nilai.
2. **Penguncian Aturan Keamanan (Fase 2):** Ubah aturan tulis `firestore.rules` untuk collection `wallets` dan `transactions` menjadi `allow write: if false;`. Seluruh klien yang mencoba memodifikasi data secara langsung akan menerima error *Permission Denied*. Pada saat yang sama, alihkan fungsi tombol simpan di UI klien untuk memicu Callable Cloud Functions atau Express API Endpoint.
3. **Pembersihan Kode Sisa (Fase 3):** Hapus seluruh import SDK Firebase transaksional yang tidak lagi terpakai di folder `/src/components/*` untuk merampingkan ukuran bundel file JavaScript klien, menyisakan `onSnapshot` murni untuk sinkronisasi antarmuka pengguna yang reaktif.

---

## PRIORITAS IMPLEMENTASI CLOUD FUNCTIONS

Acuan urutan pembangunan modul backend dari yang paling mendesak hingga yang terakhir:

1. **`apiRegisterControlledUser` (Prioritas 1 - CRITICAL):**  
   Mengintegrasikan registrasi atomik, penyalinan data `pre_users` ke `users`, penyematan Custom Claims peran, dan inisialisasi awal dompet mitra secara aman.
2. **`onBookingConfirmedDistributeCommission` (Prioritas 1 - CRITICAL):**  
   Memindahkan logika komisi multi-level jemaah-mitra-upline dari client-side admin panel ke Firebase Firestore Document Trigger demi mengamankan kas platform dari manipulasi kode.
3. **`apiApproveWithdrawalRelease` (Prioritas 2 - HIGH):**  
   Fungsi rekonsiliasi pengeluaran dana komisi dan pemotongan saldo wallet mitra yang aman dari eksploitasi nilai minus.
4. **`onBookingStatusChangedLockStock` (Prioritas 2 - HIGH):**  
   Otomatisasi penguncian kamar hotel di Saudi Arabia dan kuota kursi pesawat berjadwal saat pembayaran DP terverifikasi.
5. **`apiVerifyBookingCodeSession` (Prioritas 2 - HIGH):**  
   Portal akses aman jemaah travel umroh tanpa email menggunakan kode manifest perjalanan mereka.
6. **`apiQueryGeminiAIPromo` (Prioritas 3 - MEDIUM):**  
   Penyediaan generator teks promosi pemasaran WhatsApp berbasis kecerdasan buatan Gemini AI terisolasi di server proxy.

---
*Dokumen Cetak Blueprint ini disahkan oleh Umaroh Technical Architecture Council untuk segera diimplementasikan oleh tim pengembang Backend.*
