# 🗺️ Dokumentasi Struktur Proyek & Arsitektur Umaroh Business Platform

Dokumen ini ditujukan bagi tim pengembang untuk memahami secara mendalam arsitektur file, komponen, modul domain, dan alur data pada **Umaroh Business Platform**.

---

## 🏛️ Arsitektur Aplikasi

Aplikasi ini menggunakan pola **Full-Stack Modular React + Express Gateway** dengan pendekatan **Clean Architecture / Domain-Driven Design (DDD)** pada modul finansial dan **Firestore Hybrid Runtime** pada modul operasional.

```text
[ Browser / Android App ]
        │
        ├──> React 19 Frontend (Tailwind CSS v4 + Motion)
        │       │
        │       ├──> State Local / Firestore Client Hooks
        │       └──> Component Views (Mitra, Jamaah, Admin, Vendor)
        │
        └──> Express 5 Gateway Server (Port 3000)
                │
                ├──> Gemini AI Proxy (@google/genai)
                ├──> Firebase Admin SDK Identity Service
                └──> Migration Engine & Enterprise Middleware
```

---

## 📂 Rincian Folder & File Utama

### 1. Root Directory (`/`)
- `server.ts`: Entry point backend Express. Mengelola API route internal, middleware otentikasi/rate-limiting, dan Vite middleware untuk development mode.
- `firebase.ts`: Konfigurasi & inisialisasi Firebase Client SDK.
- `supabase.ts`: Client bridge opsional ke Supabase PostgreSQL.
- `capacitor.config.ts`: Konfigurasi aplikasi Android native (App ID: `com.amanah.app`, App Name: `Umaroh Platform`).
- `metadata.json`: Mengontrol nama, deskripsi, dan izin frame aplikasi.

### 2. Komponen UI (`/src/components/`)
Komponen UI dikelompokkan berdasarkan area fungsional:
- `DashboardView.tsx`: Dashboard utama pengarah portal multi-role (Mitra, Operasional, Jamaah, Vendor).
- `DashboardMitra.tsx`, `DashboardOperasional.tsx`, `DashboardJamaah.tsx`, `DashboardVendor.tsx`: Tampilan dashboard spesifik peran.
- **Subfolder `database/`**:
  - `FirebaseSparkView.tsx`: Control panel status & seeding Firestore.
  - `SupabaseBridgeView.tsx`: Control panel migrasi & bridging ke Supabase.
  - `GoogleDriveSyncView.tsx`: Integrasi penyimpanan dokumen Google Drive.
- **Subfolder `finance/`**:
  - `FinanceDashboard.tsx`: Manajemen arus kas, transaksi, dan saldo wallet.
  - `VendorPaymentTracker.tsx`: Pelacakan pembayaran tagihan ke vendor hotel/bus.
  - `CumulativeFinanceReport.tsx`: Laporan agregat pendapatan & komisi.
- **Subfolder `tracker/`**:
  - `TrackerKeberangkatan.tsx`: Timeline status keberangkatan rombongan.
  - `TrackerJamaah.tsx`: Pengawasan daftar jamaah aktif & paspor.
  - `TrackerBagasi.tsx`: Scan QR Code & lokasi koper bagasi.
  - `RoomingList.tsx`: Pembagian kamar hotel Makkah & Madinah.
- **Subfolder `manifest/`**:
  - `ManifestPage.tsx`, `ManifestTable.tsx`: Pengelolaan & pencetakan manifes penerbangan/visa.

### 3. Core Firestore Infrastructure (`/src/core/firestore/`)
Modul terisolasi yang mengelola konektivitas & resiliensi Firestore:
- `FirestoreRuntime.ts`: Mengelola konfigurasi database target & auto-reconnect.
- `FirestoreConnectionManager.ts`: Menangani status jaringan online/offline.
- `FirestoreOfflineCoordinator.ts`: Sinkronisasi data ketika koneksi terputus.
- `FirestoreHealthMonitor.ts` & `FirestoreDiagnostics.ts`: Monitoring kesehatan stream query.

### 4. Modul Finansial - Clean Architecture (`/src/modules/wallet/`)
Sistem ledger dompet digital yang dirancang menggunakan aturan Clean Architecture:
- `domain/aggregate/WalletAggregate.ts`: Entity root yang menjaga invariants saldo & aturan transaksi.
- `domain/events/`: Event emitter transaksi (Deposit, Transfer, Withdraw, Commission).
- `domain/policies/`: Aturan batas transaksi harian, kebijakan refund, dan komisi.
- `application/services/WalletService.ts`: Application service utama tempat eksekusi transaksi.
- `infrastructure/repositories/`: Implementasi sinkronisasi repository ke Firestore collections (`wallets`, `transactions`).

### 5. Service Layer (`/src/services/`)
- `aiService.ts`: Integrasi server-side ke Google Gemini AI untuk analisa & pembuatan flyer.
- `backendIdentityService.ts`: Admin SDK service untuk pendaftaran user & penetapan role (Custom Claims).
- `flightService.ts`: Layanan jadwal penerbangan & pencarian tiket maskapai.
- `MigrationEngine.ts`: Engine transfer data antar instance Firestore.

### 6. Script & Tools (`/scripts/`)
- `scripts/seeds/`: Injeksi data awal (misal `add_flights.ts`, `add_scoot_sub.ts`, `dedup_hotels.js`).
- `scripts/tools/`: Runner migrasi & alat bantu pengujian admin (misal `check-auth-user.ts`, `list-users.ts`, `run-migration.ts`).
- `scripts/tests/`: Suite pengujian modul enterprise & otentikasi.

---

## 📊 Alur Data Transaksi Finansial

```text
[UI Action / Input User] 
        │
        ▼
[WalletCommands.ts]
        │
        ▼
[ValidationPipeline] ──(Gagal)──> [ValidationException]
        │
     (Lolos)
        ▼
[WalletAggregate.executeTransaction()]
        │
        ├──> Invariant Checks (Cukup Saldo, Limit Harian, Status Active)
        ├──> Apply Domain Event (e.g. WalletCreditedEvent)
        │
        ▼
[WalletUnitOfWork / FirestoreTransaction]
        │
        ├──> Write Document to 'wallets' Collection
        └──> Write Journal Entry to 'transactions' Collection
```

---

## 🔒 Keamanan & Role Access Control

Terdapat 4 tingkatan peran (*role*) pada sistem yang dikontrol oleh Firebase Auth Custom Claims:
1. **Super Admin / Owner**: Akses penuh ke seluruh menu, laporan keuangan agregat, validasi mitra, dan konfigurasi database.
2. **Mitra Travel**: Akses Katalog Paket, Pendaftaran Jamaah, Komisi, dan E-Learning.
3. **Operasional / Ground Handling**: Akses Manifest, Flight Tracker, Rooming List, dan Pengiriman Bagasi.
4. **Jamaah**: Akses terbatas pada jadwal perjalanan pribadi, panduan manasik, dan tracking koper.

---

*Gunakan dokumen ini sebagai panduan referensi utama saat melakukan modifikasi atau penambahan fitur pada aplikasi.*
