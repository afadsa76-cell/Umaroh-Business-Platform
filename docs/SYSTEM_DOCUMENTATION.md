# UMAROH ERP PLATFORM - SYSTEM AUDIT & ARCHITECTURAL BLUEPRINT
## DOKUMENTASI TEKNIS & AUDIT ARSITEKTUR ENTERPRISE
**Versi Dokumen:** v2.4.0 (Enterprise Gold Release)  
**Tanggal Audit:** 09 Juli 2026  
**Status Dokumen:** STABLE & AUDITED  
**Klasifikasi:** CONFIDENTIAL / INTELLECTUAL PROPERTY  

---

## DAFTAR ISI
* [BAB 1: OVERVIEW PROJECT](#bab-1-overview-project)
* [BAB 2: ARSITEKTUR SISTEM](#bab-2-arsitektur-sistem)
* [BAB 3: STRUKTUR DATABASE (FIRESTORE SCHEMA)](#bab-3-struktur-database-firestore-schema)
* [BAB 4: FLOW AUTENTIKASI](#bab-4-flow-autentikasi)
* [BAB 5: FLOW REGISTRASI & AKTIVASI](#bab-5-flow-registrasi--aktivasi)
* [BAB 6: FLOW USER MANAGEMENT](#bab-6-flow-user-management)
* [BAB 7: FLOW BOOKING UMRAH & MANIFEST](#bab-7-flow-booking-umrah--manifest)
* [BAB 8: FLOW PEMBAYARAN & KOMISI MITRA](#bab-8-flow-pembayaran--komisi-mitra)
* [BAB 9: FLOW VENDOR & PROCUREMENT](#bab-9-flow-vendor--procurement)
* [BAB 10: ROLE & PERMISSION MATRIX](#bab-10-role--permission-matrix)
* [BAB 11: FLOW DASHBOARD & REAL-TIME SYNC](#bab-11-flow-dashboard--real-time-sync)
* [BAB 12: FIREBASE SECURITY RULES AUDIT](#bab-12-firebase-security-rules-audit)
* [BAB 13: DATA FLOW SCHEMATICS](#bab-13-data-flow-schematics)
* [BAB 14: ERROR HANDLING SYSTEM](#bab-14-error-handling-system)
* [BAB 15: AUDIT BUSINESS LOGIC & TECHNICAL DEBT](#bab-15-audit-business-logic--technical-debt)
* [BAB 16: ROADMAP PENGEMBANGAN SISTEM](#bab-16-roadmap-pengembangan-sistem)
* [BAB 17: FLOWCHART DIAGRAMS](#bab-17-flowchart-diagrams)
* [BAB 18: SYSTEM DEPENDENCIES](#bab-18-system-dependencies)
* [BAB 19: ARCHITECTURAL BEST PRACTICES](#bab-19-architectural-best-practices)
* [BAB 20: KESIMPULAN AUDIT](#bab-20-kesimpulan-audit)

---

## BAB 1: OVERVIEW PROJECT
Platform ERP Umaroh adalah sistem manajemen terpadu (Enterprise Resource Planning) yang dirancang khusus untuk memfasilitasi bisnis agen perjalanan Haji dan Umroh, kemitraan, serta jemaah secara end-to-end. Platform ini menghubungkan seluruh pemangku kepentingan dalam satu ekosistem cloud yang real-time.

### Fungsi Utama & Layanan
* **Integrasi Keagenan:** Memfasilitasi pendaftaran mitra, penjualan paket ke downline, serta kalkulasi komisi otomatis.
* **Manajemen Logistik & Perlengkapan:** Pelacakan pengemasan koper, kain ihram, mukena, hingga status pengiriman cargo perlengkapan ke alamat jemaah.
* **Pemesanan & Manifest Elektronik:** Sistem pendaftaran mandiri jemaah, pemilihan kamar, pengunggahan berkas paspor/visa, dan penyusunan manifest maskapai penerbangan.
* **Smart Business Analytics:** Evaluasi risiko piutang tertunggak, anomali dokumen, dan prediksi tren pasar memanfaatkan AI Gemini.
* **Copywriter Pemasaran Cerdas:** Generator teks promosi WhatsApp dan sosial media untuk memudahkan penjualan paket oleh Mitra.

### Relasi Antar Stakeholder
| Peran / Role | Deskripsi Tanggung Jawab & Alur Kerja |
| :--- | :--- |
| **Owner / Direktur** | Memantau KPI operasional, performa keuangan, dan profitabilitas melalui Executive Dashboard. |
| **Admin Utama** | Mengelola database user, menyetujui pendaftaran mitra baru, mempublikasikan paket umroh master. |
| **Operasional** | Mengatur alokasi manifest jemaah, koordinasi tiket pesawat, hotel di Arab Saudi, dan visa. |
| **Finance** | Memproses invoice, validasi pembayaran jemaah/mitra, kalkulasi komisi upline, disbursement. |
| **Mitra Keagenan** | Menjual paket umroh ke jemaah, mengelola jaringan keagenan di bawahnya (downline), mencairkan komisi. |
| **Vendor Sahabat** | Menyediakan akomodasi hotel, tiket pesawat, katering, handling bandara, dan update kuota. |
| **Jamaah / Customer** | Melakukan booking paket, mencicil pembayaran, mengunggah paspor/dokumen, memantau bagasi. |
| **Marketing** | Menggunakan copywriting AI untuk materi promosi WhatsApp dan sosial media, kampanye iklan. |
| **Mutawif / Tour Leader** | Memandu jemaah di tanah suci, melacak grup keberangkatan, mengupdate status kegiatan via GPS. |

---

## BAB 2: ARSITEKTUR SISTEM
Sistem dibangun menggunakan arsitektur modern Fullstack SPA dengan Google Firebase sebagai pondasi backend (*Serverless Backend-as-a-Service*).

```
┌────────────────────────────────────────────────────────┐
│                    React 19 Frontend                   │
│          (Vite + Tailwind CSS + Lucide Icons)          │
└───────────┬────────────────────────────┬───────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────┐    ┌───────────────────────────┐
│ Firebase Client SDK   │    │ Express Node Web Server   │
│ (Auth, Firestore, DB) │    │ (Gemini API Proxy, Auth)  │
└───────────────────────┘    └───────────────────────────┘
```

### Komponen Utama Arsitektur
1. **Frontend Layer:** Menggunakan React 19 dengan compiler Vite, didekorasi menggunakan Tailwind CSS untuk layout responsif tinggi dan motion untuk transisi antar modul yang mulus.
2. **Authentication Layer:** Mengamankan sistem dengan Firebase Authentication (metode Email/Password dan Google OAuth terintegrasi langsung).
3. **Database Layer:** Google Cloud Firestore berkecepatan tinggi dengan mode NoSQL untuk penyimpanan data transaksional terenkripsi.
4. **Static Host & Server Proxy:** Node.js (Express) bertindak sebagai Web Server dan proxy API aman untuk menyembunyikan API Key dari browser (misalnya Gemini API key dan Google Maps API).
5. **Storage Layer:** Firebase Storage digunakan untuk menyimpan dokumen sensitif jemaah (KTP, Paspor, Bukti Pembayaran, Sertifikat Vaksin).

---

## BAB 3: STRUKTUR DATABASE (FIRESTORE SCHEMA)
Platform ini mengandalkan NoSQL Firestore. Berikut adalah analisa terperinci seluruh collection utama beserta peran dan keamanannya:

| Collection | Deskripsi / Fungsi Utama | Primary Key | Akses Baca/Tulis |
| :--- | :--- | :--- | :--- |
| `users` | Menyimpan profil utama pengguna terdaftar. | UID Auth | Pemilik UID & Admin |
| `pre_users` | Daftar antrean pendaftaran user yang belum diaktivasi. | Random ID | Admin & Publik Sign-in |
| `wallets` | Menyimpan saldo komisi, mutasi, dan poin mitra. | UID Auth | Mitra & Finance |
| `bookings` | Transaksi booking paket perjalanan jemaah. | Random ID | Jamaah, Mitra & Admin |
| `paket_master` | Template / master paket wisata dan umrah operasional. | Random ID | Admin & Semua (Read) |
| `paket_mitra` | Paket umrah yang dikustomisasi oleh mitra tertentu. | Random ID | Mitra Pemilik & Admin |
| `transactions` | Mutasi keuangan, penarikan saldo, & bayar paket. | Random ID | Finance & Pemilik |
| `tracker_jamaah` | Status keberangkatan, paspor, visa, koper jemaah. | Random ID | Jamaah, TL, & Operasional |
| `pendaftaran_mitra` | Data pendaftaran calon mitra baru (antrean validasi). | Random ID | Admin & Calon Mitra |
| `master_hotels` | Katalog hotel di Mekkah/Madinah (harga & bintang). | Random ID | Operasional & Vendor |
| `system_blueprint_nodes` | Peta alur proses (blueprint) visual ERP. | Random ID | Admin & Owner |
| `ad_campaigns` | Manajemen kampanye periklanan digital travel. | Random ID | Marketing & Admin |

---

## BAB 4: FLOW AUTENTIKASI
Sistem mendukung tiga gerbang autentikasi utama untuk menjamin kemudahan akses pengguna:

### 1. Autentikasi Email & Password
User memasukkan email dan password. Firebase Auth memverifikasi kredensial. Jika sukses, sistem mengambil UID, lalu melakukan lookup dokumen di `users/{UID}` untuk mengidentifikasi Role dan merender Dashboard yang sesuai.

### 2. Google Sign-In (OAuth 2.0)
Menggunakan popup Google Auth. Setelah token diterbitkan, sistem memverifikasi email di Firestore. Jika email terdaftar di `pre_users` (antrean aktivasi) atau merupakan user baru, sistem memicu pop-up pemilihan role atau menyelesaikan registrasi terlebih dahulu.

### 3. Portal Kode Booking (Akses Instan Jamaah)
Bagi jemaah yang tidak memiliki akun email, mereka dapat masuk secara instan menggunakan Kode Booking (Booking Code) yang tercantum pada manifest perjalanan mereka. Sistem melakukan lookup ke `bookings` dengan filter kode tersebut, membuat sesi local terenkripsi di `localStorage`, dan mengarahkan langsung ke Dashboard Jamaah tanpa memerlukan akun Firebase Auth.

---

## BAB 5: FLOW REGISTRASI & AKTIVASI
Alur registrasi dirancang dengan konsep "Aktivasi Terkontrol" untuk mencegah pendaftaran liar yang dapat merusak data platform.

### Langkah Registrasi & Aktivasi Terbimbing:
1. **Langkah 1 (Pre-Creation):** Admin mendaftarkan calon user (mitra, vendor, operasional) melalui panel User Database. Sistem membuat dokumen baru di collection `pre_users` dengan status "pending" dan ID acak (Random ID).
2. **Langkah 2 (Aktivasi Akun):** Calon user melakukan pendaftaran akun (Sign Up) menggunakan Email atau Google Auth di LoginView. Sistem mendeteksi bahwa email yang didaftarkan cocok dengan entri di `pre_users`.
3. **Langkah 3 (Atomic Migration):** Menggunakan `runTransaction`, sistem memindahkan profil dari `pre_users` ke `users/{UID}` (dengan UID Firebase Auth sebagai key baru) secara instan. Sistem juga menandai dokumen di `pre_users` menjadi status "activated", mencatat metadata pendaftaran, dan membuat dokumen `wallets/{UID}` dengan saldo awal Rp 0 secara otomatis.
4. **Langkah 4 (Fallback Auto-Heal):** Jika data profil tidak ditemukan di `pre_users`, sistem melakukan fallback ke tabel `pendaftaran_mitra` atau melakukan inisialisasi default berdasarkan sufiks email (contoh: email mengandung "mitra" mendapat role mitra secara otomatis).

---

## BAB 6: FLOW USER MANAGEMENT
Manajemen pengguna diatur secara terpusat melalui modul `UserDatabaseView.tsx`. Admin Utama memiliki kekuasaan penuh atas status siklus hidup pengguna.

### Siklus Hidup Status Pengguna (User Status Lifecycle):
* **Pending:** Akun baru dibuat oleh Admin di `pre_users` dan sedang menunggu pengguna melakukan Sign-Up pertama kali.
* **Activated:** Pengguna telah berhasil login pertama kali, profil telah dimigrasikan ke UID Auth, dan status akun aktif penuh.
* **Suspended:** Akun ditangguhkan sementara oleh Admin. Hak akses membaca/menulis ke Firestore diblokir melalui aturan keamanan (Firestore Security Rules).
* **Deleted:** Dokumen user dan wallet dihapus dari Firestore (Soft Delete atau Hard Delete tergantung konfigurasi).

---

## BAB 7: FLOW BOOKING UMRAH & MANIFEST
Proses pemesanan paket umroh dirancang agar transparan dan terstruktur dengan baik.

### Tahapan Alur Kerja Booking:
1. **Pencarian Paket:** Jamaah atau Mitra mencari paket yang tersedia di `KatalogPaketView.tsx`. Mitra dapat membagikan link penawaran komisi langsung.
2. **Booking Form:** Mengisi formulir manifest jamaah, memilih tipe kamar (Double/Triple/Quad), dan mengunggah dokumen KTP/Paspor.
3. **Penerbitan Invoice & Pembayaran:** Invoice diterbitkan secara otomatis di `bookings`. Jamaah membayar DP (Down Payment) atau mencicil via transfer bank ke Finance.
4. **Validasi Finansial:** Finance menyetujui transaksi pembayaran. Saldo divalidasi, sisa piutang dihitung otomatis.
5. **Pembuatan Tracker Jamaah:** Setelah status booking disetujui, entri baru di `tracker_jamaah` otomatis dibuat untuk melacak dokumen fisik (Paspor, Buku Kuning Vaksin Meningitis), pengiriman perlengkapan (Koper, Ihram, Mukena), dan visa.
6. **Manifest & Flight Booking:** Bagian Operasional menyusun manifest final penerbangan di `ManifestPage.tsx` dan menerbitkan e-ticket serta voucher hotel jemaah.
7. **Kepulangan & Arsip:** Setelah ibadah selesai, data perjalanan diarsipkan untuk analisis keberangkatan tahun berikutnya.

---

## BAB 8: FLOW PEMBAYARAN & KOMISI MITRA
Alur keuangan merupakan bagian paling krusial dari platform ini demi menghindari kecurangan keuangan.

### Konsep Rekonsiliasi Keuangan Platform:
1. **Metode Pembayaran Termin:** Jamaah dapat melakukan pembayaran dalam 3 termin (DP, Termin 2, Pelunasan). Setiap pembayaran wajib disertai bukti transfer fisik yang diupload ke Cloud Storage.
2. **Penghitungan Komisi Kemitraan (Multi-tier Commission):** Ketika booking divalidasi oleh Finance, sistem secara otomatis menghitung hak komisi untuk mitra yang merekrut jamaah tersebut, serta komisi untuk upline mitra di tingkat atasnya (Multi-level networking). Komisi langsung ditambahkan ke dokumen `wallets/{mitraId}`.
3. **Sistem Dompet (Wallets & Withdrawal):** Mitra dapat mengajukan pencairan dana (Withdrawal) di dashboard mereka. Permintaan penarikan dicatat di collection `transactions` dengan tipe "withdraw" dan status "pending". Finance akan mereview penarikan tersebut, mentransfer dana secara manual ke rekening mitra, kemudian mengubah status transaksi menjadi "approved" yang akan memotong saldo wallet secara real-time.

---

## BAB 9: FLOW VENDOR & PROCUREMENT
Aplikasi mempermudah procurement komponen paket perjalanan umroh melalui portal khusus Vendor.

### Manajemen Pengadaan Komponen Perjalanan:
* **Vendor Hotel:** Mengelola alokasi kamar di Mekkah & Madinah, mengupdate ketersediaan kuota secara berkala, dan mengunggah dokumen konfirmasi booking (rooming list).
* **Vendor Maskapai:** Menyediakan kuota kursi (seat flight) berjadwal langsung dari Jakarta/Surabaya ke Jeddah/Madinah.
* **Handling Bandara:** Melacak kedatangan jemaah, memandu pengambilan bagasi, dan memastikan kelancaran imigrasi.
* **Mutawif / Tour Guide:** Vendor mutawif lokal di Saudi menerima jadwal bimbingan ibadah, nomor kontak ketua rombongan, serta rute ziarah tambahan.

---

## BAB 10: ROLE & PERMISSION MATRIX
Berikut adalah matriks hak akses resmi dari platform ERP Umaroh untuk memastikan kepatuhan tata kelola data:

| Role | Daftar Menu / Akses Tab | Aktivitas yang Diizinkan | Batasan / Larangan |
| :--- | :--- | :--- | :--- |
| **Owner** | Semua Tab, KPI, Revenue | Melihat laporan margin laba, ekspor laporan audit finansial. | Tidak boleh melakukan input data transaksi harian. |
| **Admin** | User DB, Paket Master | Mengatur otorisasi akun, approve pendaftaran mitra, set paket. | Tidak memiliki tombol bayar/kasir keuangan. |
| **Operasional** | Manifest, Flights, Inventory | Input jadwal terbang, urus visa, atur logistik perlengkapan. | Dilarang melihat ringkasan profit atau mengedit komisi. |
| **Finance** | Transactions, Wallets, Audit | Validasi bayar, approve withdraw komisi, audit vendor cost. | Dilarang mendaftarkan user baru atau mengedit manifes. |
| **Mitra** | Downline, Katalog, Wallet | Mendaftarkan jemaah baru, melacak komisi, mengajukan WD. | Hanya bisa membaca data jemaah miliknya sendiri. |
| **Vendor** | Hotel, Maskapai, Layanan | Update harga komponen hotel/tiket, upload voucher kamar. | Hanya dapat melihat pemesanan terkait jasanya saja. |
| **Jamaah** | Dashboard Jamaah, Tracker | Melihat status bagasi, cicilan pembayaran, jadwal manasik. | Sama sekali tidak memiliki akses ke database internal. |

---

## BAB 11: FLOW DASHBOARD & REAL-TIME SYNC
Setiap role mendapatkan tampilan dashboard yang sangat disesuaikan (Custom Role-Based Dashboard) dengan visualisasi data spesifik:

### Sinkronisasi Real-Time vs Caching:
* **onSnapshot Real-time Sync:** Untuk data transaksional sensitif seperti manifest jemaah, pembayaran, dan saldo wallet, platform menggunakan Firebase `onSnapshot` secara penuh untuk menjamin data selalu sinkron di seluruh perangkat tanpa reload.
* **Firestore Local Cache:** Untuk data statis atau referensi master (seperti nama bandara, list kota, atau template dokumen), platform menerapkan offline-caching di Firestore Local Cache demi menghemat kuota baca database dan mempercepat waktu muat aplikasi.

---

## BAB 12: FIREBASE SECURITY RULES AUDIT
Berdasarkan file `firestore.rules` yang kami analisa, terdapat beberapa temuan penting terkait keamanan data:

### Temuan Aturan Keamanan (Security Rules Warnings):
* **Insecure Open Reads:** Sistem mendeteksi adanya 39 peringatan keamanan (Insecure open read rules) di beberapa collection penting (seperti `master_hotels`, `paket_master`, dan `ad_campaigns`). Aturan ini memperbanyak resiko kebocoran data jika tidak dibatasi berdasarkan authentication token.
* **Strict Write Guard:** Aturan penulisan (write rules) untuk `users` telah diamankan dengan baik: `allow write: if request.auth.uid == userId;` namun berisiko mematahkan kompatibilitas migrasi klien seperti dijelaskan di bab audit.

---

## BAB 13: DATA FLOW SCHEMATICS
Berikut diagram alur pertukaran data utama dalam sistem ERP:

### 1. Aliran Data Transaksi Komisi Mitra
```
[Jamaah Bayar Paket] ──► [Finance Validasi Pembayaran] ──► [Trigger Komisi Mitra]
                                                                  │
                                                                  ▼
[Mitra Terima Update Saldo] ◄── [onSnapshot UI Update] ◄── [Set wallets/{mitraId}]
```

### 2. Aliran Data Pendaftaran User
```
[Admin Input User] ──► [Simpan pre_users (pending)] ──► [User Sign Up di Client]
                                                                │
                                                                ▼
[Dashboard Aktif] ◄── [Active status & set users/{uid}] ◄── [Atomic runTransaction]
```

---

## BAB 14: ERROR HANDLING SYSTEM
Aplikasi menerapkan strategi mitigasi kesalahan yang tangguh melalui modul `firebase.ts` dan `ErrorBoundary.tsx`:

### Jenis Penanganan Masalah:
* **Kuota Firestore Habis (Resource Exhausted):** Jika kuota harian habis, sistem akan mendeteksi error kode "resource-exhausted", memunculkan banner peringatan ramah ke pengguna, dan mengalihkan pembacaan ke Local SQLite/IndexedDB cadangan.
* **Kondisi Offline:** Saat koneksi internet terputus, Firestore local persistence diaktifkan secara otomatis. Seluruh transaksi penulisan akan disimpan di antrean lokal (Local Queue) dan secara otomatis disinkronkan ke cloud saat koneksi pulih.
* **Kegagalan Transaksi Migrasi:** Jika transaksi migrasi user gagal di tengah jalan, seluruh operasi di-rollback sehingga tidak ada profil atau dompet yang terbuat setengah jalan.

---

## BAB 15: AUDIT BUSINESS LOGIC & TECHNICAL DEBT
Berdasarkan audit mendalam terhadap logika migrasi user di `LoginView.tsx` dan struktur `UserDatabaseView.tsx`:

### Analisa & Jawaban Temuan Audit:
1. **Apakah masih ada penggunaan deleteDoc() saat migrasi akun?**  
   *Jawaban:* **TIDAK ADA.** Sistem memperbarui status dokumen lama menjadi "migrated" demi menjaga integritas data (audit trail) dan mencegah kehilangan histori transaksi jemaah/mitra.
2. **Apakah masih ada proses copy profile dari random document ID ke UID Authentication?**  
   *Jawaban:* **YA.** Terdapat proses pencarian kecocokan email pada dokumen `users` ber-ID acak dan menyalin profilnya ke dokumen baru ber-ID UID Firebase Auth.
3. **Apakah proses migrasi menggunakan runTransaction() atau writeBatch()?**  
   *Jawaban:* **Menggunakan runTransaction().** Hal ini memastikan sifat ACID (Atomisitas) database terpenuhi secara utuh ketika memindahkan profil dan wallet jemaah secara bersamaan.
4. **Apakah terdapat kemungkinan data profil atau wallet menjadi setengah berpindah apabila salah satu operasi gagal?**  
   *Jawaban:* **TIDAK.** Karena menggunakan `runTransaction`, jika terjadi kegagalan di tengah jalan, seluruh penulisan akan di-rollback ke kondisi awal. Namun, data relasional di tabel lain seperti `bookings` berpotensi menjadi yatim (dangling reference) jika mereferensikan ID acak lama alih-alih UID baru.
5. **Apakah sistem masih membuat dokumen users menggunakan random ID?**  
   *Jawaban:* **TIDAK.** Penambahan user baru di database panel diletakkan di collection `pre_users` dengan ID acak. Dokumen di tabel `users` utama hanya akan dibuat ketika proses aktivasi login berhasil menggunakan UID Auth resmi.
6. **Apakah terdapat potensi race condition apabila dua perangkat login bersamaan?**  
   *Jawaban:* **YA.** Kueri pencarian email dilakukan di luar scope `runTransaction`. Jika dua perangkat login bersamaan secara instan, kedua transaksi dapat berjalan paralel dan saling menindih penulisan tanpa mendeteksi eksistensi target terlebih dahulu.
7. **Apakah terdapat kemungkinan kehilangan data ketika Firestore Rules berubah?**  
   *Jawaban:* **SANGAT TINGGI.** Jika aturan keamanan diubah menjadi strict `allow read, write: if request.auth.uid == userId`, kueri email lookup untuk mencari ID lama akan diblokir oleh Firestore dengan status Permission Denied, melumpuhkan seluruh proses migrasi otomatis jemaah lama.

---

## BAB 16: ROADMAP PENGEMBANGAN SISTEM
Rencana kerja strategis untuk mengeliminasi technical debt dan meningkatkan performa sistem:

1. **Prioritas Tinggi - Server-Side User Provisioning:**  
   Membuat API route `/api/auth/create-user` menggunakan Firebase Admin SDK agar akun Auth dan dokumen `users/{uid}` dibuat secara atomik dan bersamaan saat diinput oleh Admin. Ini akan mengeliminasi kebutuhan tabel `pre_users` dan flow migrasi klien sepenuhnya!
2. **Prioritas Tinggi - Hardening Rules & Firestore Audit:**  
   Menutup 39 celah "Insecure Open Reads" di `firestore.rules` dan menyinkronkan token claims untuk pembatasan data vendor/mitra.
3. **Prioritas Sedang - Cloud Functions Commissions:**  
   Memindahkan kalkulasi matematika komisi multi-level dari sisi klien ke cloud backend guna meminimalkan risiko eksploitasi nilai komisi.
4. **Prioritas Rendah - Push WhatsApp Integration:**  
   Menghubungkan update status logistik jemaah ke gateway WhatsApp untuk pemantauan real-time.

---

## BAB 17: FLOWCHART DIAGRAMS

### 1. Alur Aktivasi Kontrol Jemaah
```
[Admin input data user]
       │
       ▼
[Buat doc pending di pre_users (Random ID)]
       │
       ▼
[User Sign Up pertama kali di Client]
       │
       ▼
[Transaction mencocokkan email, set users/{UID}, update pre_users, init wallet]
       │
       ▼
[Dashboard Aktif & Migrasi Selesai]
```

### 2. Alur Pengajuan Withdraw Komisi Mitra
```
[Mitra klik Withdraw] ──► [Input Nominal & Bank] ──► [Buat doc transactions "pending"]
                                                                  │
                                                                  ▼
[Saldo wallet terpotong] ◄── [Finance set Status "approved"] ◄── [Finance transfer fisik]
```

---

## BAB 18: SYSTEM DEPENDENCIES
Daftar pustaka perangkat lunak utama yang membentuk fondasi platform:

* `firebase` (^12.10.0) - SDK komunikasi cloud database & auth utama.
* `firebase-admin` (^14.1.0) - Integrasi kontrol penuh server-side (list-users API).
* `react` / `react-dom` (^19.0.0) - Pustaka rendering UI berbasis komponen reaktif.
* `vite` (^6.2.0) - Engine build & bundling modern berkecepatan tinggi.
* `motion` (^12.23.24) - Library animasi transisi layout dashboard premium.
* `jspdf` / `html2pdf.js` (^4.2.1) - Generator penerbitan dokumen PDF laporam instan.
* `xlsx` (^0.18.5) - Parser eksportasi dokumen manifest jemaah ke file Excel.

---

## BAB 19: ARCHITECTURAL BEST PRACTICES
Panduan standar kualitas pengkodean bagi tim pengembang Umaroh ERP:

1. **Prinsip Lazy Initialization:** Selalu lakukan lazy-init pada SDK server-side (seperti Firebase Admin atau Gemini) di dalam API handler untuk mencegah server crash saat kunci rahasia belum terdefinisi di environment variables.
2. **Ketergantungan State React:** Hindari re-render tanpa akhir (infinite loop) dengan menyederhanakan dependensi `useEffect` hanya menggunakan nilai primitif (string, number, boolean) atau state stabil.
3. **Deklarasi Tipe Data Terpusat:** Semua skema data, antarmuka (interface), and enums wajib diletakkan di file `/src/types.ts` secara modular guna menghindari redundansi tipe.

---

## BAB 20: KESIMPULAN AUDIT
Platform ERP Umaroh telah dirancang dengan arsitektur berorientasi pengguna yang tangguh dan didukung oleh sinkronisasi cloud real-time yang stabil.

* **Bagian Stabil:** Alur kerja booking, manajemen logistik bagasi jemaah, manifest maskapai, dan sistem pembuatan copywriting pemasaran menggunakan AI Gemini.
* **Bagian Prioritas Pembenahan:** Rekonstruksi alur pendaftaran user dari client-side transaction ke backend API server guna menghilangkan celah keamanan rules dan potensi race condition.
* **Kesimpulan Akhir:** Sistem ini sangat siap untuk berkembang pesat, namun penutupan technical debt terkait autentikasi di masa transisi ini sangat disarankan sebelum platform meluncurkan kampanye iklan skala besar guna mengamankan dana serta data jemaah.

---
*Dokumen ini diterbitkan secara otomatis oleh Umaroh System Auditor Engine. Segala bentuk penggandaan tanpa izin merupakan pelanggaran hukum hak cipta.*
