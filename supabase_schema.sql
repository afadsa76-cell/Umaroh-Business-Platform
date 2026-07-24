-- ====================================================================
-- SKEMA DATABASE LENGKAP UNTUK SUPABASE (UMAROH MARKETPLACE & ENTERPRISE)
-- ====================================================================
-- Petunjuk Penggunaan:
-- 1. Buka Dashboard Supabase Anda (https://app.supabase.com)
-- 2. Pilih Project Anda -> Buka menu "SQL Editor" di bilah navigasi kiri
-- 3. Klik "New Query", tempelkan seluruh kode SQL di bawah ini, lalu klik "Run"
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL USERS (Data Pengguna, Mitra, Admin, Jamaah, Finance)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE,
    email TEXT,
    name TEXT,
    namaLengkap TEXT,
    role TEXT DEFAULT 'jamaah',
    subRole TEXT,
    phone TEXT,
    brandName TEXT,
    namaVendor TEXT,
    passwordAwal TEXT,
    status TEXT DEFAULT 'active',
    address TEXT,
    kota TEXT,
    jenisMitra TEXT,
    balance NUMERIC DEFAULT 0,
    uplineId TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL PENDAFTARAN MITRA (Aplikasi Pendaftaran Kemitraan)
CREATE TABLE IF NOT EXISTS public.pendaftaran_mitra (
    id TEXT PRIMARY KEY,
    uid TEXT,
    email TEXT,
    nama TEXT,
    namaLengkap TEXT,
    phone TEXT,
    brandName TEXT,
    paketId TEXT,
    uplineId TEXT,
    provinsi TEXT,
    kota TEXT,
    kecamatan TEXT,
    desaKelurahan TEXT,
    alamatLengkap TEXT,
    status TEXT DEFAULT 'pending',
    targetMonthlyPackets INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL BOOKINGS (Data Pemesanan Paket Jamaah & Manifest)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    paketId TEXT,
    mitraId TEXT,
    jamaahId TEXT,
    customerName TEXT,
    namaJamaah TEXT,
    nama_paspor TEXT,
    customerPhone TEXT,
    noHp TEXT,
    emailJamaah TEXT,
    alamat TEXT,
    totalPax INT DEFAULT 1,
    totalPrice NUMERIC DEFAULT 0,
    dpPaid NUMERIC DEFAULT 0,
    passportStatus TEXT DEFAULT 'pending',
    ktpStatus TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'confirmed',
    namaPaket TEXT,
    documents JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL UMAROH MASTER DATA (Data Master Konfigurasi & Harga Produk Component)
CREATE TABLE IF NOT EXISTS public.umaroh_master_data (
    id TEXT PRIMARY KEY,
    data JSONB,
    updatedAt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL WALLETS (Dompet Elektronik User/Mitra)
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE,
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL TRANSACTIONS (Riwayat Mutasi Saldo & Keuangan)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    walletId TEXT,
    userId TEXT,
    recipientId TEXT,
    amount NUMERIC DEFAULT 0,
    type TEXT,
    referenceId TEXT,
    description TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL PAKET MASTER (Katalog Paket Umroh & Wisata)
CREATE TABLE IF NOT EXISTS public.paket_master (
    id TEXT PRIMARY KEY,
    nama TEXT,
    title TEXT,
    lokasi TEXT,
    durasiHari INT DEFAULT 9,
    tanggalKeberangkatan DATE,
    status TEXT DEFAULT 'active',
    hargaStart NUMERIC DEFAULT 0,
    img TEXT,
    airline TEXT,
    hotelMekkah TEXT,
    hotelMadinah TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL MASTER HOTELS
CREATE TABLE IF NOT EXISTS public.master_hotels (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INT DEFAULT 3,
    city TEXT,
    vendor TEXT,
    distance TEXT,
    pricePerNight NUMERIC DEFAULT 0,
    pricePerNightDouble NUMERIC DEFAULT 0,
    pricePerNightTriple NUMERIC DEFAULT 0,
    pricePerNightQuad NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL MASTER PAKET WISATA
CREATE TABLE IF NOT EXISTS public.master_paket_wisata (
    id TEXT PRIMARY KEY,
    nama TEXT,
    deskripsi TEXT,
    durasiHari INT DEFAULT 5,
    lokasi TEXT,
    img TEXT,
    hargaStart NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL FLIGHTS (Jadwal Penerbangan Maskapai)
CREATE TABLE IF NOT EXISTS public.flights (
    id TEXT PRIMARY KEY,
    maskapai TEXT,
    flightNumber TEXT,
    route TEXT,
    departureDate TIMESTAMPTZ,
    arrivalDate TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEKS PERFORMA QUERY
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_bookings_paketId ON public.bookings(paketId);
CREATE INDEX IF NOT EXISTS idx_bookings_mitraId ON public.bookings(mitraId);
CREATE INDEX IF NOT EXISTS idx_transactions_userId ON public.transactions(userId);
CREATE INDEX IF NOT EXISTS idx_transactions_walletId ON public.transactions(walletId);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SECURE ACCESS
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendaftaran_mitra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umaroh_master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paket_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_paket_wisata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated access (Public read/write for web app client integration)
CREATE POLICY "Public full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to pendaftaran_mitra" ON public.pendaftaran_mitra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to umaroh_master_data" ON public.umaroh_master_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to wallets" ON public.wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to paket_master" ON public.paket_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to master_hotels" ON public.master_hotels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to master_paket_wisata" ON public.master_paket_wisata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to flights" ON public.flights FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- SEED DEFAULT ADMIN USER (SUPABASE INITIALIZATION)
-- ====================================================================
INSERT INTO public.users (id, uid, email, name, namaLengkap, role, status)
VALUES ('admin-default-01', 'admin-default-01', 'afadsa76@gmail.com', 'Admin Umaroh', 'Admin Utama Umaroh', 'super_admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Selesai.
