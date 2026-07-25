# 🕋 Umaroh Business Platform

**Umaroh Business Platform** adalah platform digital penyedia layanan *one-stop solution* (SaaS B2B & B2C) untuk ekosistem bisnis perjalanan Umrah dan Haji Plus. Platform ini mengintegrasikan seluruh operasional travel umrah—mulai dari manajemen katalog & kuotasi paket, reservasi hotel Makkah/Madinah, manajemen penerbangan & tiket maskapai, penerbitan visa & komponen transportasi, tracking jamaah real-time, ledger keuangan digital (Wallet), hingga koordinasi tim lapangan (Tour Leader & Mutawif).

---

## 🚀 Fitur Utama System

1. **Dashboard Multi-Role (Portal Terpadu)**
   - **Portal Mitra Travel (B2B):** Pengelolaan pendaftaran mitra, Katalog Paket khusus mitra, validasi komisi, dan e-learning mitra.
   - **Portal Operasional:** Ground handling Saudi & Domestik, rooming list, manifes jamaah, tracking manifes paspor, perlengkapan, dan distribusi visa.
   - **Portal Jamaah (B2C):** Manasik interaktif, jadwal penerbangan, tracking perjalanan & koper bagasi, panduan ibadah.
   - **Portal Vendor & Land Handling:** Pengelolaan reservasi hotel, tiket maskapai, transportasi bus, dan mutawif.
   - **Portal Owner & Finansial:** Ringkasan KPI omset, akumulasi pendapatan, ledger wallet, serta integrasi pencatatan keuangan.

2. **Sistem Keuangan & Wallet Ledger (Clean Architecture / Domain-Driven Design)**
   - Modul `wallet` berbasis Clean Architecture dengan *Aggregate Root*, *Event Sourcing*, *Validation Pipeline*, *Idempotency Guarantee*, dan *Audit Trail*.
   - Dukungan transaksi multi-mata uang (SAR, IDR, USD) dengan konversi kurs terintegrasi.

3. **Database Dual Engine & Synchronizer**
   - Firestore cloud database utama dengan kemampuan *real-time listener* dan pencadangan otomatis.
   - Bridge Supabase (PostgreSQL) opsional untuk *analytics query* lanjutan.
   - Engine Sinkronisasi Offline-to-Online (*Offline First Coordinator*) yang menjaga kestabilan data jaringan.

4. **Tracking Operasional Real-Time**
   - Live Map tracking jamaah & rombongan berbasis Leaflet/React-Leaflet.
   - QR Code Scanner (`html5-qrcode`) untuk tracking bagasi koper dan manifes rombongan.

5. **AI Marketing & Intelligent Assistant**
   - Generator Flyer & Promosi otomatis bertenaga Google Gemini AI (`@google/genai`).
   - Analisis performa campaign iklan dan smart analytics.

6. **Mobile App Support (Android via Capacitor v6)**
   - Mendukung kompilasi Native Android melalui Capacitor.
   - Fitur kamera native, toast notification, sharing, dan akselerasi jaringan mobile.

---

## 🛠️ Teknologi yang Digunakan

### **Frontend Framework & Styling**
- **React 19** & **TypeScript (v5.8)** - Runtime frontend modern dengan type-safety tinggi.
- **Vite (v6)** - Build tool kilat & dev server teroptimasi.
- **Tailwind CSS v4** (`@tailwindcss/vite`) - Styling berbasis utility-first CSS.
- **Lucide React** - Set ikon vektor konsisten & ringan.
- **Motion (Framer Motion v12)** - Animasi transisi antarmuka yang presisi.

### **Backend & API Architecture**
- **Node.js & Express (v5)** - REST API Gateway & Server-side proxy untuk menjaga kerahasiaan API Key.
- **`tsx` & `esbuild`** - Bundling backend server cepat ke CommonJS (`dist/server.cjs`) untuk Cloud Run deployment.
- **Google Gen AI SDK (`@google/genai`)** - Integrasi server-side Gemini AI.

### **Database, Cloud & Auth**
- **Firebase Firestore & Authentication** (v12 SDK & Firebase Admin v14) - Database dokumen utama real-time dan manajemen identitas pengguna.
- **Supabase JavaScript Client** - Integrasi database sekunder.
- **Capacitor Google Auth** - Plugin otentikasi Google pada perangkat Android.

### **Export & Visualisasi Data**
- **jsPDF & html2pdf.js / html2canvas** - Generator PDF otomatis untuk pembuatan Quotation, Offering Letter, dan Manifest.
- **XLSX (SheetJS)** - Export / Import data spreadsheet Excel.
- **Leaflet & React-Leaflet** - Peta interaktif tracking rombongan jamaah.
- **HTML5-QRCode & QRCode** - Pemindai dan pembuatan QR Code.

---

## 📁 Struktur Folder Project

```text
├── android/                    # Proyek Native Android (Capacitor v6)
├── docs/                       # Dokumentasi arsitektur, laporan audit & runbook
├── public/                     # Asset statis, logo, video, & data JSON default
├── scripts/                    # Script otomatisasi, migration, seed, & tools
│   ├── data/                   # Data master JSON & script data
│   ├── migration/              # Validator & toolkit migrasi Firestore
│   ├── seeds/                  # Script injeksi data master (Hotel, Maskapai, Flight)
│   ├── tests/                  # Suite pengujian enterprise & auth
│   └── tools/                  # Script runner, syncing, & pendaftaran pengguna
├── src/                        # Source code aplikasi utama
│   ├── assets/                 # Gambar dan grafik internal
│   ├── components/             # Komponen UI React
│   │   ├── dashboard/          # Komponen peta live & kpi
│   │   ├── database/           # Pengelolaan Firestore, Supabase, & Google Drive
│   │   ├── finance/            # Dashboard keuangan, ledger, & payment tracker
│   │   ├── inventory/          # Pengelolaan perlengkapan & stok
│   │   ├── manifest/           # Export & pembuatan tabel manifes
│   │   └── tracker/            # Tracking keberangkatan, rooming, & bagasi
│   ├── core/                   # Modul Firestore Runtime (Connection, Retry, Metrics, etc.)
│   ├── data/                   # Data konstan master (Bandara, Hotel, Maskapai, etc.)
│   ├── hooks/                  # Custom React Hooks (useKurs, useMaskapai, etc.)
│   ├── middleware/             # Middleware Express (Auth, Rate Limit, Validator)
│   ├── migration/              # Orchestrator migrasi database
│   ├── modules/                # Domain-Driven Design (DDD) Subsystems
│   │   └── wallet/             # Domain Aggregate Root Wallet & Ledger Transaction System
│   ├── services/               # Layanan API (Flight, Identity, Notification, AI, etc.)
│   ├── test/                   # Suite pengujian unit, integrasi, & chaos engineering
│   ├── types/                  # Definisi antarmuka & tipe data TypeScript
│   ├── utils/                  # Helper fungsi (PDF export, format currency, date, logger)
│   ├── App.tsx                 # Root Router & State Management UI Utama
│   ├── firebase.ts             # Inisialisasi Firebase Client
│   ├── main.tsx                # Entry point React DOM
│   └── supabase.ts             # Inisialisasi Supabase Client
├── server.ts                   # Backend Express Server entry point
├── metadata.json               # Metadata aplikasi & izin platform
├── package.json                # Dependensi proyek & npm scripts
└── vite.config.ts              # Konfigurasi Vite & Tailwind plugin
```

---

## ⚡ Panduan Menjalankan Project

### 1. Prasyarat System
- Node.js versi 18+ atau 20+
- npm versi 9+

### 2. Mode Pengkodingan & Development
Untuk menjalankan server pengembangan lokal (Frontend + Backend Express + Hot Refresh):
```bash
npm run dev
```
Aplikasi akan aktif pada **http://localhost:3000**.

### 3. Build Produksi
Proses build mengompilasi rules Firestore, bundle frontend React via Vite, dan bundle backend server via `esbuild`:
```bash
npm run build
```

### 4. Menjalankan Server Produksi
Setelah proses build selesai:
```bash
npm run start
```

### 5. Memeriksa Kualitas Kode & Tipe Data
```bash
# Verifikasi linting & TypeScript typecheck
npm run lint

# Menjalankan unit & integration test suite
npm run test
```

---

## 📱 Pengembangan Mobile (Android via Capacitor)

Sistem ini mendukung integrasi penuh dengan Android Studio melalui Capacitor v6:

1. **Sinkronisasi Kode Web ke Android:**
   ```bash
   npm run cap:sync
   ```
2. **Membuka Proyek di Android Studio:**
   ```bash
   npm run cap:open
   ```

---

## 🤝 Panduan Serah Terima Project (Developer Handover)

Bagi pengembang yang akan melanjutkan proyek ini:

1. **Memahami Arsitektur State & Persistence:**
   - Data utama disimpan di Firestore collection seperti `users`, `pendaftaran_mitra`, `bookings`, `wallets`, `transactions`, `paket_master`, dan `master_hotels`.
   - Modul `src/core/firestore/FirestoreRuntime.ts` mengatur auto-reconnect, status koneksi, dan switch database ID.

2. **Memahami Modul Keuangan (`src/modules/wallet`):**
   - Menggunakan prinsip Clean Architecture & DDD. Segala mutasi keuangan harus melalui `WalletService` dan `WalletCommands` untuk memastikan kepatuhan aturan bisnis dan konsistensi ledger.

3. **Lokasi Script Utilitas & Seed:**
   - Jika ingin menambah data master hotel atau penerbangan baru, gunakan script di dalam folder `scripts/seeds/`.
   - Script pengecekan akun user & migrasi ada di dalam `scripts/tools/`.

4. **Variabel Lingkungan (`.env.example`):**
   - Selalu periksa `.env.example` saat menambahkan API key baru (seperti `GEMINI_API_KEY`, `FIREBASE_API_KEY`, dll).

---

*Dokumen ini dibuat otomatis sebagai panduan standar pengembangan & pemeliharaan Umaroh Business Platform.*
