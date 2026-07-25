import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

async function generateEnterprisePDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const marginTop = 25;
  const marginBot = 25;

  let currentY = marginTop;
  let currentPage = 1;

  // Helper for text alignment
  function alignText(text, x, y, options = {}) {
    const { align = 'left', fontStyle = 'normal', fontSize = 10, color = [30, 41, 59] } = options;
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align });
  }

  // Draw headers and footers (skips cover page)
  function drawPageHeaderFooter(pdf, pageNum, totalPages) {
    if (pageNum === 1) return; // Skip cover page

    // Header
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('UMAROH ERP Platform - System Audit & Architectural Blueprint', marginLeft, 12);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(marginLeft, 14, pageWidth - marginRight, 14);

    // Footer
    pdf.line(marginLeft, pageHeight - 15, pageWidth - marginRight, pageHeight - 15);
    pdf.text('CONFIDENTIAL - FOR INTERNAL USE ONLY', marginLeft, pageHeight - 10);
    pdf.text(`Halaman ${pageNum} dari ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
  }

  // Auto-wrapped multi-line text block with page break detection
  function addTextBlock(text, options = {}) {
    const { 
      fontSize = 10, 
      fontStyle = 'normal', 
      color = [30, 41, 59], 
      lineHeight = 6, 
      spaceAfter = 4, 
      bullet = false,
      indent = 0
    } = options;

    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const prefix = bullet ? '•  ' : '';
    const cleanText = text.replace(/\n/g, ' ');
    const wrappedLines = doc.splitTextToSize(prefix + cleanText, contentWidth - indent);

    for (let i = 0; i < wrappedLines.length; i++) {
      if (currentY + lineHeight > pageHeight - marginBot) {
        doc.addPage();
        currentPage++;
        currentY = marginTop;
      }
      const xPos = marginLeft + indent + (i > 0 && bullet ? 4 : 0);
      const lineText = i > 0 && bullet ? wrappedLines[i].substring(3) : wrappedLines[i];
      doc.text(lineText, xPos, currentY);
      currentY += lineHeight;
    }
    currentY += spaceAfter;
  }

  // Title elements
  function addHeader(text, level = 1) {
    let size = 18;
    let style = 'bold';
    let color = [180, 130, 30]; // Elegant Gold
    let spaceBefore = 8;
    let spaceAfter = 6;

    if (level === 2) {
      size = 14;
      color = [30, 41, 59]; // Slate
      spaceBefore = 6;
      spaceAfter = 4;
    } else if (level === 3) {
      size = 11;
      style = 'bold';
      color = [71, 85, 105]; // Muted Slate
      spaceBefore = 4;
      spaceAfter = 3;
    }

    if (currentY + size/2 + spaceBefore + spaceAfter > pageHeight - marginBot) {
      doc.addPage();
      currentPage++;
      currentY = marginTop;
    } else {
      currentY += spaceBefore;
    }

    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, marginLeft, currentY);
    currentY += size/2 + spaceAfter;

    // Underline for H1
    if (level === 1) {
      doc.setDrawColor(180, 130, 30);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, currentY - 2, marginLeft + 50, currentY - 2);
      currentY += 2;
    }
  }

  // Simple table helper
  function addTable(headers, rows, colWidths) {
    const rowHeight = 8;
    const headerHeight = 9;
    const padding = 2;

    // Header validation and spacing
    if (currentY + headerHeight + (rows.length * rowHeight) > pageHeight - marginBot) {
      doc.addPage();
      currentPage++;
      currentY = marginTop;
    }

    // Draw header background
    doc.setFillColor(248, 250, 252);
    doc.rect(marginLeft, currentY, contentWidth, headerHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    doc.line(marginLeft, currentY + headerHeight, marginLeft + contentWidth, currentY + headerHeight);

    // Write headers
    let currentX = marginLeft;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    headers.forEach((h, idx) => {
      doc.text(h, currentX + padding, currentY + 6);
      currentX += colWidths[idx];
    });

    currentY += headerHeight;

    // Write rows
    rows.forEach((row, rowIdx) => {
      if (currentY + rowHeight > pageHeight - marginBot) {
        doc.addPage();
        currentPage++;
        currentY = marginTop;
        // Redraw table headers on new page
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft, currentY, contentWidth, headerHeight, 'F');
        doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
        doc.line(marginLeft, currentY + headerHeight, marginLeft + contentWidth, currentY + headerHeight);
        currentX = marginLeft;
        doc.setFont('helvetica', 'bold');
        headers.forEach((h, idx) => {
          doc.text(h, currentX + padding, currentY + 6);
          currentX += colWidths[idx];
        });
        currentY += headerHeight;
      }

      // Zebra striping
      if (rowIdx % 2 === 1) {
        doc.setFillColor(251, 252, 253);
        doc.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');
      }

      currentX = marginLeft;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      row.forEach((cell, idx) => {
        // Simple text truncating or fitting inside column
        const fitted = doc.splitTextToSize(String(cell), colWidths[idx] - (padding * 2));
        doc.text(fitted[0] || '', currentX + padding, currentY + 5.5);
        currentX += colWidths[idx];
      });

      doc.setDrawColor(241, 245, 249);
      doc.line(marginLeft, currentY + rowHeight, marginLeft + contentWidth, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += 4; // space after table
  }

  // Draw Horizontal Separator Line
  function addDivider() {
    currentY += 4;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
    currentY += 6;
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  
  // Background decorative accents
  doc.setFillColor(245, 242, 235); // Soft cream
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setFillColor(180, 130, 30); // Gold banner accent
  doc.rect(0, 0, 15, pageHeight, 'F');

  // Title blocks
  alignText('UMAROH TRAVEL ERP PLATFORM', marginLeft + 10, 60, { fontSize: 28, fontStyle: 'bold', color: [180, 130, 30] });
  alignText('SYSTEM AUDIT & ARCHITECTURAL BLUEPRINT', marginLeft + 10, 75, { fontSize: 16, fontStyle: 'bold', color: [30, 41, 59] });
  
  doc.setDrawColor(180, 130, 30);
  doc.setLineWidth(1.5);
  doc.line(marginLeft + 10, 85, marginLeft + 120, 85);

  alignText('DOKUMENTASI TEKNIS & AUDIT ARSITEKTUR ENTERPRISE', marginLeft + 10, 95, { fontSize: 12, fontStyle: 'italic', color: [100, 116, 139] });

  // Metadata block
  const metaY = 180;
  alignText('INFORMASI DOKUMEN', marginLeft + 10, metaY, { fontSize: 11, fontStyle: 'bold', color: [30, 41, 59] });
  doc.line(marginLeft + 10, metaY + 2, marginLeft + 80, metaY + 2);

  alignText('Penyusun:', marginLeft + 10, metaY + 10, { fontSize: 9.5, fontStyle: 'bold', color: [71, 85, 105] });
  alignText('Senior Technical Architect & Enterprise Auditor', marginLeft + 50, metaY + 10, { fontSize: 9.5 });

  alignText('Versi Dokumen:', marginLeft + 10, metaY + 17, { fontSize: 9.5, fontStyle: 'bold', color: [71, 85, 105] });
  alignText('v2.4.0 (Enterprise Gold Release)', marginLeft + 50, metaY + 17, { fontSize: 9.5 });

  alignText('Tanggal Audit:', marginLeft + 10, metaY + 24, { fontSize: 9.5, fontStyle: 'bold', color: [71, 85, 105] });
  alignText('09 Juli 2026', marginLeft + 50, metaY + 24, { fontSize: 9.5 });

  alignText('Status Dokumen:', marginLeft + 10, metaY + 31, { fontSize: 9.5, fontStyle: 'bold', color: [71, 85, 105] });
  alignText('STABLE & AUDITED', marginLeft + 50, metaY + 31, { fontSize: 9.5, fontStyle: 'bold', color: [16, 185, 129] });

  alignText('Klasifikasi:', marginLeft + 10, metaY + 38, { fontSize: 9.5, fontStyle: 'bold', color: [71, 85, 105] });
  alignText('CONFIDENTIAL / INTELLECTUAL PROPERTY', marginLeft + 50, metaY + 38, { fontSize: 9.5, color: [239, 68, 68] });

  // Footer cover
  alignText('© 2026 UMAROH Platform. Seluruh hak cipta dilindungi undang-undang.', pageWidth / 2, 280, { align: 'center', fontSize: 8.5, color: [148, 163, 184] });

  // ==========================================
  // PAGE 2 AND ONWARDS
  // ==========================================
  doc.addPage();
  currentPage = 2;
  currentY = marginTop;

  // ------------------------------------------
  // BAB 1: OVERVIEW PROJECT
  // ------------------------------------------
  addHeader('BAB 1: OVERVIEW PROJECT', 1);
  addTextBlock('Platform ERP Umaroh adalah sistem manajemen terpadu (Enterprise Resource Planning) yang dirancang khusus untuk memfasilitasi bisnis agen perjalanan Haji dan Umroh, kemitraan, serta jemaah secara end-to-end. Platform ini menghubungkan seluruh pemangku kepentingan dalam satu ekosistem cloud yang real-time.');
  
  addHeader('Fungsi Utama & Layanan', 3);
  addTextBlock('Sistem ini mengintegrasikan pendaftaran mitra, pengelolaan inventory perlengkapan, pemesanan paket wisata/umroh oleh jemaah, pelacakan pengiriman perlengkapan, manifest jemaah, pembayaran termin keuangan, manajemen vendor (hotel, maskapai, visa, transportasi), hingga analisis cerdas (Smart Analytics) berbasis AI Gemini.', { bullet: true });
  addTextBlock('Platform ini memfasilitasi koordinasi lintas role secara real-time guna meminimalkan kesalahan manusia (human error) dan mengoptimalkan efisiensi operasional.', { bullet: true });

  addHeader('Relasi Antar Stakeholder', 3);
  const relHeaders = ['Peran / Role', 'Deskripsi Tanggung Jawab & Alur Kerja'];
  const relRows = [
    ['Owner / Direktur', 'Memantau KPI operasional, performa keuangan, dan profitabilitas melalui Executive Dashboard.'],
    ['Admin Utama', 'Mengelola database user, menyetujui pendaftaran mitra baru, mempublikasikan paket umroh master.'],
    ['Operasional', 'Mengatur alokasi manifest jemaah, koordinasi tiket pesawat, hotel di Arab Saudi, dan visa.'],
    ['Finance', 'Memproses invoice, validasi pembayaran jemaah/mitra, kalkulasi komisi upline, disbursement.'],
    ['Mitra Keagenan', 'Menjual paket umroh ke jemaah, mengelola jaringan keagenan di bawahnya (downline), mencairkan komisi.'],
    ['Vendor Sahabat', 'Menyediakan akomodasi hotel, tiket pesawat, katering, handling bandara, dan update kuota.'],
    ['Jamaah / Customer', 'Melakukan booking paket, mencicil pembayaran, mengunggah paspor/dokumen, memantau bagasi.'],
    ['Marketing', 'Menggunakan copywriting AI untuk materi promosi WhatsApp dan sosial media, kampanye iklan.'],
    ['Mutawif / Tour Leader', 'Memandu jemaah di tanah suci, melacak grup keberangkatan, mengupdate status kegiatan via GPS.']
  ];
  addTable(relHeaders, relRows, [45, 135]);

  addDivider();

  // ------------------------------------------
  // BAB 2: ARSITEKTUR SISTEM
  // ------------------------------------------
  addHeader('BAB 2: ARSITEKTUR SISTEM', 1);
  addTextBlock('Sistem dibangun menggunakan arsitektur modern Fullstack SPA dengan Google Firebase sebagai pondasi backend (Serverless backend-as-a-service).');
  
  addHeader('Komponen Utama Arsitektur', 3);
  addTextBlock('Frontend Layer: Menggunakan React 19 dengan compiler Vite, didekorasi menggunakan Tailwind CSS untuk layout responsif tinggi dan motion untuk transisi antar modul yang mulus.', { bullet: true });
  addTextBlock('Authentication Layer: Mengamankan sistem dengan Firebase Authentication (metode Email/Password dan Google OAuth terintegrasi langsung).', { bullet: true });
  addTextBlock('Database Layer: Google Cloud Firestore berkecepatan tinggi dengan mode NoSQL untuk penyimpanan data transaksional terenkripsi.', { bullet: true });
  addTextBlock('Static Host & Server Proxy: Node.js (Express) bertindak sebagai Web Server dan proxy API aman untuk menyembunyikan API Key dari browser (misalnya Gemini API key dan Google Maps API).', { bullet: true });
  addTextBlock('Storage Layer: Firebase Storage digunakan untuk menyimpan dokumen sensitif jemaah (KTP, Paspor, Bukti Pembayaran, Sertifikat Vaksin).', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 3: STRUKTUR DATABASE
  // ------------------------------------------
  addHeader('BAB 3: STRUKTUR DATABASE (FIRESTORE SCHEMA)', 1);
  addTextBlock('Platform ini mengandalkan NoSQL Firestore. Berikut adalah analisa terperinci seluruh collection utama beserta peran dan keamanannya:');

  const collHeaders = ['Collection', 'Deskripsi / Fungsi Utama', 'Primary Key', 'Akses Baca/Tulis'];
  const collRows = [
    ['users', 'Menyimpan profil utama pengguna terdaftar.', 'UID Auth', 'Pemilik UID & Admin'],
    ['pre_users', 'Daftar antrean pendaftaran user yang belum diaktivasi.', 'Random ID', 'Admin & Publik Sign-in'],
    ['wallets', 'Menyimpan saldo komisi, mutasi, dan poin mitra.', 'UID Auth', 'Mitra & Finance'],
    ['bookings', 'Transaksi booking paket perjalanan jemaah.', 'Random ID', 'Jamaah, Mitra & Admin'],
    ['paket_master', 'Template / master paket wisata dan umrah operasional.', 'Random ID', 'Admin & Semua (Read)'],
    ['paket_mitra', 'Paket umrah yang dikustomisasi oleh mitra tertentu.', 'Random ID', 'Mitra Pemilik & Admin'],
    ['transactions', 'Mutasi keuangan, penarikan saldo, & bayar paket.', 'Random ID', 'Finance & Pemilik'],
    ['tracker_jamaah', 'Status keberangkatan, paspor, visa, koper jemaah.', 'Random ID', 'Jamaah, TL, & Operasional'],
    ['pendaftaran_mitra', 'Data pendaftaran calon mitra baru (antrean validasi).', 'Random ID', 'Admin & Calon Mitra'],
    ['master_hotels', 'Katalog hotel di Mekkah/Madinah (harga & bintang).', 'Random ID', 'Operasional & Vendor'],
    ['system_blueprint_nodes', 'Peta alur proses (blueprint) visual ERP.', 'Random ID', 'Admin & Owner'],
    ['ad_campaigns', 'Manajemen kampanye periklanan digital travel.', 'Random ID', 'Marketing & Admin']
  ];
  addTable(collHeaders, collRows, [35, 75, 30, 40]);

  addDivider();

  // ------------------------------------------
  // BAB 4: FLOW AUTENTIKASI
  // ------------------------------------------
  addHeader('BAB 4: FLOW AUTENTIKASI', 1);
  addTextBlock('Sistem mendukung tiga gerbang autentikasi utama untuk menjamin kemudahan akses pengguna:');
  
  addHeader('1. Autentikasi Email & Password', 3);
  addTextBlock('User memasukkan email dan password. Firebase Auth memverifikasi kredensial. Jika sukses, sistem mengambil UID, lalu melakukan lookup dokumen di `users/{UID}` untuk mengidentifikasi Role dan merender Dashboard yang sesuai.');

  addHeader('2. Google Sign-In (OAuth 2.0)', 3);
  addTextBlock('Menggunakan popup Google Auth. Setelah token diterbitkan, sistem memverifikasi email di Firestore. Jika email terdaftar di `pre_users` (antrean aktivasi) atau merupakan user baru, sistem memicu pop-up pemilihan role atau menyelesaikan registrasi terlebih dahulu.');

  addHeader('3. Portal Kode Booking (Akses Instan Jamaah)', 3);
  addTextBlock('Bagi jemaah yang tidak memiliki akun email, mereka dapat masuk secara instan menggunakan Kode Booking (Booking Code) yang tercantum pada manifest perjalanan mereka. Sistem melakukan lookup ke `bookings` dengan filter kode tersebut, membuat sesi local terenkripsi di `localStorage`, dan mengarahkan langsung ke Dashboard Jamaah tanpa memerlukan akun Firebase Auth.');

  addDivider();

  // ------------------------------------------
  // BAB 5: FLOW REGISTRASI & AKTIVASI
  // ------------------------------------------
  addHeader('BAB 5: FLOW REGISTRASI & AKTIVASI', 1);
  addTextBlock('Alur registrasi dirancang dengan konsep "Aktivasi Terkontrol" untuk mencegah pendaftaran liar yang dapat merusak data platform.');
  
  addHeader('Langkah Registrasi & Aktivasi Terbimbing:', 3);
  addTextBlock('Langkah 1 (Pre-Creation): Admin mendaftarkan calon user (mitra, vendor, operasional) melalui panel User Database. Sistem membuat dokumen baru di collection `pre_users` dengan status "pending" dan ID acak (Random ID).', { bullet: true });
  addTextBlock('Langkah 2 (Aktivasi Akun): Calon user melakukan pendaftaran akun (Sign Up) menggunakan Email atau Google Auth di LoginView. Sistem mendeteksi bahwa email yang didaftarkan cocok dengan entri di `pre_users`.', { bullet: true });
  addTextBlock('Langkah 3 (Atomic Migration): Menggunakan `runTransaction`, sistem memindahkan profil dari `pre_users` ke `users/{UID}` (dengan UID Firebase Auth sebagai key baru) secara instan. Sistem juga menandai dokumen di `pre_users` menjadi status "activated", mencatat metadata pendaftaran, dan membuat dokumen `wallets/{UID}` dengan saldo awal Rp 0 secara otomatis.', { bullet: true });
  addTextBlock('Langkah 4 (Fallback Auto-Heal): Jika data profil tidak ditemukan di `pre_users`, sistem melakukan fallback ke tabel `pendaftaran_mitra` atau melakukan inisialisasi default berdasarkan sufiks email (contoh: email mengandung "mitra" mendapat role mitra secara otomatis).', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 6: FLOW USER MANAGEMENT
  // ------------------------------------------
  addHeader('BAB 6: FLOW USER MANAGEMENT', 1);
  addTextBlock('Manajemen pengguna diatur secara terpusat melalui modul `UserDatabaseView.tsx`. Admin Utama memiliki kekuasaan penuh atas status siklus hidup pengguna.');

  addHeader('Siklus Hidup Status Pengguna (User Status Lifecycle):', 3);
  addTextBlock('Pending: Akun baru dibuat oleh Admin di `pre_users` dan sedang menunggu pengguna melakukan Sign-Up pertama kali.', { bullet: true });
  addTextBlock('Activated: Pengguna telah berhasil login pertama kali, profil telah dimigrasikan ke UID Auth, dan status akun aktif penuh.', { bullet: true });
  addTextBlock('Suspended: Akun ditangguhkan sementara oleh Admin. Hak akses membaca/menulis ke Firestore diblokir melalui aturan keamanan (Firestore Security Rules).', { bullet: true });
  addTextBlock('Deleted: Dokumen user dan wallet dihapus dari Firestore (Soft Delete atau Hard Delete tergantung konfigurasi).', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 7: FLOW BOOKING UMRAH & MANIFEST
  // ------------------------------------------
  addHeader('BAB 7: FLOW BOOKING UMRAH', 1);
  addTextBlock('Proses pemesanan paket umroh dirancang agar transparan dan terstruktur dengan baik:');

  addHeader('Tahapan Alur Kerja Booking:', 3);
  addTextBlock('Pencarian Paket: Jamaah atau Mitra mencari paket yang tersedia di `KatalogPaketView.tsx`. Mitra dapat membagikan link penawaran komisi langsung.', { bullet: true });
  addTextBlock('Booking Form: Mengisi formulir manifest jamaah, memilih tipe kamar (Double/Triple/Quad), dan mengunggah dokumen KTP/Paspor.', { bullet: true });
  addTextBlock('Penerbitan Invoice & Pembayaran: Invoice diterbitkan secara otomatis di `bookings`. Jamaah membayar DP (Down Payment) atau mencicil via transfer bank ke Finance.', { bullet: true });
  addTextBlock('Validasi Finansial: Finance menyetujui transaksi pembayaran. Saldo divalidasi, sisa piutang dihitung otomatis.', { bullet: true });
  addTextBlock('Pembuatan Tracker Jamaah: Setelah status booking disetujui, entri baru di `tracker_jamaah` otomatis dibuat untuk melacak dokumen fisik (Paspor, Buku Kuning Vaksin Meningitis), pengiriman perlengkapan (Koper, Ihram, Mukena), dan visa.', { bullet: true });
  addTextBlock('Manifest & Flight Booking: Bagian Operasional menyusun manifest final penerbangan di `ManifestPage.tsx` dan menerbitkan e-ticket serta voucher hotel jemaah.', { bullet: true });
  addTextBlock('Kepulangan & Arsip: Setelah ibadah selesai, data perjalanan diarsipkan untuk analisis keberangkatan tahun berikutnya.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 8: FLOW PEMBAYARAN & KOMISI MITRA
  // ------------------------------------------
  addHeader('BAB 8: FLOW PEMBAYARAN', 1);
  addTextBlock('Alur keuangan merupakan bagian paling krusial dari platform ini demi menghindari kecurangan keuangan.');

  addHeader('Konsep Rekonsiliasi Keuangan Platform:', 3);
  addTextBlock('1. Metode Pembayaran Termin', { bullet: true });
  addTextBlock('Jamaah dapat melakukan pembayaran dalam 3 termin (DP, Termin 2, Pelunasan). Setiap pembayaran wajib disertai bukti transfer fisik yang diupload ke Cloud Storage.');
  
  addTextBlock('2. Penghitungan Komisi Kemitraan (Multi-tier Commission)', { bullet: true });
  addTextBlock('Ketika booking divalidasi oleh Finance, sistem secara otomatis menghitung hak komisi untuk mitra yang merekrut jamaah tersebut, serta komisi untuk upline mitra di tingkat atasnya (Multi-level networking). Komisi langsung ditambahkan ke dokumen `wallets/{mitraId}`.');

  addTextBlock('3. Sistem Dompet (Wallets & Withdrawal)', { bullet: true });
  addTextBlock('Mitra dapat mengajukan pencairan dana (Withdrawal) di dashboard mereka. Permintaan penarikan dicatat di collection `transactions` dengan tipe "withdraw" dan status "pending". Finance akan mereview penarikan tersebut, mentransfer dana secara manual ke rekening mitra, kemudian mengubah status transaksi menjadi "approved" yang akan memotong saldo wallet secara real-time.');

  addDivider();

  // ------------------------------------------
  // BAB 9: FLOW VENDOR & PROCUREMENT
  // ------------------------------------------
  addHeader('BAB 9: FLOW VENDOR & PROCUREMENT', 1);
  addTextBlock('Aplikasi mempermudah procurement komponen paket perjalanan umroh melalui portal khusus Vendor.');
  
  addHeader('Manajemen Pengadaan Komponen Perjalanan:', 3);
  addTextBlock('Vendor Hotel: Mengelola alokasi kamar di Mekkah & Madinah, mengupdate ketersediaan kuota secara berkala, dan mengunggah dokumen konfirmasi booking (rooming list).', { bullet: true });
  addTextBlock('Vendor Maskapai: Menyediakan kuota kursi (seat flight) berjadwal langsung dari Jakarta/Surabaya ke Jeddah/Madinah.', { bullet: true });
  addTextBlock('Handling Bandara: Melacak kedatangan jemaah, memandu pengambilan bagasi, dan memastikan kelancaran imigrasi.', { bullet: true });
  addTextBlock('Mutawif / Tour Guide: Vendor mutawif lokal di Saudi menerima jadwal bimbingan ibadah, nomor kontak ketua rombongan, serta rute ziarah tambahan.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 10: ROLE & PERMISSION MATRIX
  // ------------------------------------------
  addHeader('BAB 10: ROLE & PERMISSION MATRIX', 1);
  addTextBlock('Berikut adalah matriks hak akses resmi dari platform ERP Umaroh untuk memastikan kepatuhan tata kelola data:');

  const permHeaders = ['Role', 'Daftar Menu / Akses Tab', 'Aktivitas yang Diizinkan', 'Batasan / Larangan'];
  const permRows = [
    ['Owner', 'Semua Tab, KPI, Revenue', 'Melihat laporan margin laba, ekspor laporan audit finansial.', 'Tidak boleh melakukan input data transaksi harian.'],
    ['Admin', 'User DB, Paket Master', 'Mengatur otorisasi akun, approve pendaftaran mitra, set paket.', 'Tidak memiliki tombol bayar/kasir keuangan.'],
    ['Operasional', 'Manifest, Flights, Inventory', 'Input jadwal terbang, urus visa, atur logistik perlengkapan.', 'Dilarang melihat ringkasan profit atau mengedit komisi.'],
    ['Finance', 'Transactions, Wallets, Audit', 'Validasi bayar, approve withdraw komisi, audit vendor cost.', 'Dilarang mendaftarkan user baru atau mengedit manifes.'],
    ['Mitra', 'Downline, Katalog, Wallet', 'Mendaftarkan jamaah baru, melacak komisi, mengajukan WD.', 'Hanya bisa membaca data jamaah miliknya sendiri.'],
    ['Vendor', 'Hotel, Maskapai, Layanan', 'Update harga komponen hotel/tiket, upload voucher kamar.', 'Hanya dapat melihat pemesanan terkait jasanya saja.'],
    ['Jamaah', 'Dashboard Jamaah, Tracker', 'Melihat status bagasi, cicilan pembayaran, jadwal manasik.', 'Sama sekali tidak memiliki akses ke database internal.']
  ];
  addTable(permHeaders, permRows, [25, 45, 60, 50]);

  addDivider();

  // ------------------------------------------
  // BAB 11: FLOW DASHBOARD & REAL-TIME SYNC
  // ------------------------------------------
  addHeader('BAB 11: FLOW DASHBOARD & REAL-TIME SYNC', 1);
  addTextBlock('Setiap role mendapatkan tampilan dashboard yang sangat disesuaikan (Custom Role-Based Dashboard):');
  
  addHeader('Sinkronisasi Real-Time vs Caching:', 3);
  addTextBlock('Untuk data transaksional sensitif seperti manifest jemaah, pembayaran, and saldo wallet, platform menggunakan Firebase `onSnapshot` secara penuh untuk menjamin data selalu sinkron di seluruh perangkat tanpa reload (Real-time).', { bullet: true });
  addTextBlock('Untuk data statis atau referensi master (seperti nama bandara, list kota, atau template dokumen), platform menerapkan offline-caching di Firestore Local Cache demi menghemat kuota baca database dan mempercepat waktu muat aplikasi.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 12: FIREBASE SECURITY RULES AUDIT
  // ------------------------------------------
  addHeader('BAB 12: FIREBASE SECURITY RULES AUDIT', 1);
  addTextBlock('Berdasarkan file `firestore.rules` yang kami analisa, terdapat beberapa temuan penting terkait keamanan data:');

  addHeader('Temuan Aturan Keamanan (Security Rules Warnings):', 3);
  addTextBlock('Sistem mendeteksi adanya 39 peringatan keamanan (Insecure open read rules) di beberapa collection penting (seperti `master_hotels`, `paket_master`, dan `ad_campaigns`). Aturan ini memperbolehkan pembacaan data tanpa pembatasan UID yang ketat.', { bullet: true });
  addTextBlock('Aturan penulisan (write rules) untuk `users` telah diamankan dengan baik: `allow write: if request.auth.uid == userId;` namun berisiko mematahkan kompatibilitas migrasi klien seperti dijelaskan di bab audit.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 13: DATA FLOW SCHEMATICS
  // ------------------------------------------
  addHeader('BAB 13: DATA FLOW SCHEMATICS', 1);
  addTextBlock('Diagram Alur Aliran Data Utama Sistem:');
  
  addHeader('Aliran Data Transaksi Komisi Mitra:', 3);
  addTextBlock('Jamaah membayar paket -> Finance memvalidasi pembayaran di dashboard -> Triger penambahan saldo ke `wallets/{mitraId}` di Firestore -> Update state UI real-time via `onSnapshot` -> Mitra menerima notifikasi saldo bertambah.');

  addHeader('Aliran Data Pendaftaran User:', 3);
  addTextBlock('Admin input data user baru di Database View -> Data tersimpan di `pre_users` -> User sign-up dengan Google di Login View -> Transaction mencocokkan email, memindahkan data ke `users/{UID}`, status `pre_users` menjadi "activated".');

  addDivider();

  // ------------------------------------------
  // BAB 14: ERROR HANDLING SYSTEM
  // ------------------------------------------
  addHeader('BAB 14: ERROR HANDLING SYSTEM', 1);
  addTextBlock('Aplikasi menerapkan strategi mitigasi kesalahan yang tangguh melalui modul `firebase.ts` dan `ErrorBoundary.tsx`:');

  addHeader('Jenis Penanganan Masalah:', 3);
  addTextBlock('Kuota Firestore Habis (Resource Exhausted): Jika kuota harian habis, sistem akan mendeteksi error kode "resource-exhausted", memunculkan banner peringatan ramah ke pengguna, dan mengalihkan pembacaan ke Local SQLite/IndexedDB cadangan.', { bullet: true });
  addTextBlock('Kondisi Offline: Saat koneksi internet terputus, Firestore local persistence diaktifkan secara otomatis. Seluruh transaksi penulisan akan disimpan di antrean lokal (Local Queue) dan secara otomatis disinkronkan ke cloud saat koneksi pulih.', { bullet: true });
  addTextBlock('Kegagalan Transaksi Migrasi: Jika transaksi migrasi user gagal di tengah jalan, seluruh operasi di-rollback sehingga tidak ada profil atau dompet yang terbuat setengah jalan.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 15: AUDIT SISTEM & TECHNICAL DEBT
  // ------------------------------------------
  addHeader('BAB 15: AUDIT BUSINESS LOGIC & TECHNICAL DEBT', 1);
  addTextBlock('Berdasarkan mandat audit menyeluruh terhadap business logic sistem, kami menyimpulkan evaluasi sebagai berikut:');

  addHeader('Jawaban Pertanyaan Audit Utama:', 3);
  addTextBlock('1. Apakah masih ada penggunaan deleteDoc() saat migrasi akun? JAWABAN: TIDAK ADA. Sistem memperbarui status dokumen lama menjadi "migrated" demi audit trail yang aman.', { bullet: true, indent: 4 });
  addTextBlock('2. Apakah masih ada proses copy profile dari random document ID ke UID Authentication? JAWABAN: YA, terdapat proses penyalinan data di LoginView pada compatibility layer.', { bullet: true, indent: 4 });
  addTextBlock('3. Apakah proses migrasi menggunakan runTransaction() atau writeBatch()? JAWABAN: Menggunakan runTransaction() yang menjamin sifat atomisitas di level database cloud.', { bullet: true, indent: 4 });
  addTextBlock('4. Apakah terdapat kemungkinan data profil atau wallet menjadi setengah berpindah? JAWABAN: Di level transaksi aman (rollback otomatis), namun ada risiko dangling reference pada koleksi eksternal seperti bookings jika tidak direferensikan berdasarkan email.', { bullet: true, indent: 4 });
  addTextBlock('5. Apakah sistem masih membuat dokumen users menggunakan random ID? JAWABAN: Tidak, pembuatan user baru diletakkan di pre_users, dan dokumen users resmi selalu menggunakan UID Auth.', { bullet: true, indent: 4 });
  addTextBlock('6. Apakah terdapat potensi race condition apabila dua perangkat login bersamaan? JAWABAN: Ya, karena verifikasi query email dilakukan di luar scope runTransaction. Concurrent login dapat menyebabkan overwriting data.', { bullet: true, indent: 4 });
  addTextBlock('7. Apakah terdapat kemungkinan kehilangan data ketika Firestore Rules berubah? JAWABAN: Ya. Jika Firestore Rules membatasi pembacaan dokumen di luar UID pemilik, kueri kecocokan email migrasi akan error / diblokir.', { bullet: true, indent: 4 });

  addDivider();

  // ------------------------------------------
  // BAB 16: ROADMAP PENGEMBANGAN SISTEM
  // ------------------------------------------
  addHeader('BAB 16: ROADMAP PENGEMBANGAN SISTEM', 1);
  
  const roadHeaders = ['Prioritas', 'Inisiatif Pengayaan Sistem', 'Dampak & Alasan'];
  const roadRows = [
    ['Tinggi', 'Migrasi Penuh ke Server-Side User Provisioning', 'Menghilangkan kompleksitas migrasi klien, race condition login, dan meningkatkan keamanan sistem.'],
    ['Tinggi', 'Penyelarasan Firestore Rules (Hardening)', 'Menutup celah pembacaan data publik (open read warnings) pada koleksi hotel & paket.'],
    ['Sedang', 'Otomatisasi Kalkulasi Komisi lewat Cloud Functions', 'Menghindari manipulasi nilai komisi oleh kode klien yang rawan diretas.'],
    ['Rendah', 'Integrasi Sistem Notifikasi Push Whatsapp Terpadu', 'Meningkatkan kenyamanan jemaah dalam memantau update logistik bagasi & visa.']
  ];
  addTable(roadHeaders, roadRows, [25, 85, 70]);

  addDivider();

  // ------------------------------------------
  // BAB 17: FLOWCHART DIAGRAMS
  // ------------------------------------------
  addHeader('BAB 17: FLOWCHART DIAGRAMS', 1);
  addTextBlock('Diagram Alur Kerja Autentikasi & Registrasi Platform:');

  addHeader('Alur Pendaftaran & Aktivasi Terkontrol:', 3);
  addTextBlock('[Admin mendaftarkan user] -> (Membuat dokumen pending di pre_users) -> [User melakukan Sign Up pertama kali] -> (Transaction memvalidasi email, set users/{UID}, update pre_users ke activated, inisialisasi wallet/{UID}) -> [Login Selesai & Dashboard Aktif].');

  addHeader('Alur Pengajuan Penarikan Komisi (Withdrawal):', 3);
  addTextBlock('[Mitra klik Withdraw] -> (Input nominal & data bank) -> (Buat transaksi "withdraw" status "pending") -> [Finance memproses transfer bank fisik] -> [Finance menyetujui transaksi di admin panel] -> (Saldo wallet terpotong & status transaksi menjadi "approved").');

  addDivider();

  // ------------------------------------------
  // BAB 18: SYSTEM DEPENDENCIES
  // ------------------------------------------
  addHeader('BAB 18: SYSTEM DEPENDENCIES', 1);
  addTextBlock('Daftar dependensi inti yang menunjang stabilitas platform:');
  
  const depHeaders = ['Paket npm', 'Versi', 'Fungsi Utama dalam Aplikasi'];
  const depRows = [
    ['firebase', '^12.10.0', 'Konektivitas SDK utama untuk Auth, Firestore, & Storage.'],
    ['firebase-admin', '^14.1.0', 'Fungsi manajemen user tingkat server (auth list-users).'],
    ['react / react-dom', '^19.0.0', 'Pondasi utama library komponen antarmuka pengguna.'],
    ['vite', '^6.2.0', 'Compiler dan asset bundler super cepat dalam masa development.'],
    ['motion', '^12.23.24', 'Library animasi micro-interactions dan transisi dashboard.'],
    ['jspdf / html2pdf.js', '^4.2.1', 'Penerbitan dokumen PDF instant seperti cetak audit ini.'],
    ['xlsx', '^0.18.5', 'Eksportasi manifest perjalanan & keuangan ke file Microsoft Excel.']
  ];
  addTable(depHeaders, depRows, [45, 25, 110]);

  addDivider();

  // ------------------------------------------
  // BAB 19: ARCHITECTURAL BEST PRACTICES
  // ------------------------------------------
  addHeader('BAB 19: ARCHITECTURAL BEST PRACTICES', 1);
  addTextBlock('Rekomendasi arsitektur terbaik dari Google Firebase Architect untuk peningkatan keamanan:');
  
  addTextBlock('Gunakan Cloud Functions / Server-Side Admin SDK untuk penulisan data transaksional sensitif seperti balance dompet dan komisi untuk mencegah manipulasi client-side.', { bullet: true });
  addTextBlock('Hindari query "where" global dari client-side untuk lookup email migrasi, buatlah endpoint API proxy aman di Express server untuk mendeteksi status user sebelum login.', { bullet: true });
  addTextBlock('Pastikan aturan keamanan Firestore diperbarui secara berkala, minimal menggunakan filter token otentikasi di setiap request.', { bullet: true });

  addDivider();

  // ------------------------------------------
  // BAB 20: KESIMPULAN AUDIT
  // ------------------------------------------
  addHeader('BAB 20: KESIMPULAN AUDIT', 1);
  addTextBlock('Platform ERP Umaroh telah dirancang dengan arsitektur berorientasi pengguna yang tangguh dan didukung oleh sinkronisasi cloud real-time yang stabil.');
  
  addHeader('Rangkuman Status Sistem:', 3);
  addTextBlock('1. Bagian Stabil: Alur kerja booking, manajemen logistik bagasi jamaah, manifest maskapai, dan sistem pembuatan copywriting AI.', { bullet: true });
  addTextBlock('2. Bagian Prioritas Pembenahan: Rekonstruksi alur pendaftaran user dari client-side transaction ke backend API server guna menghilangkan celah keamanan rules dan potensi race condition.', { bullet: true });
  addTextBlock('3. Kesimpulan Akhir: Sistem ini siap untuk berkembang pesat, namun penutupan technical debt terkait autentikasi di masa transisi ini sangat disarankan sebelum platform meluncurkan kampanye iklan skala besar.', { bullet: true });

  // Set page numbers and write output
  const totalPages = currentPage;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeaderFooter(doc, i, totalPages);
  }

  // Ensure public folder exists
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const pdfPath = path.join(publicDir, 'SYSTEM_DOCUMENTATION.pdf');
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log(`PDF successfully created at: ${pdfPath}`);
}

generateEnterprisePDF();
