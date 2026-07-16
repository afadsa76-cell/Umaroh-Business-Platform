export interface Maskapai {
  id: string;
  name: string;
  hargaJual: number;
  hargaBeli: number;
  margin: number;
  persen: number;
  programDays: number;
  tanggalKeberangkatan: string;
  tanggalKepulangan: string;
  originCityName: string;
  destinationCityName: string;
  namaVendor: string;
  totalSeats: number;
  availableSeats: number;
  ruteLabel?: string;
  hargaSetoran?: number;
  tipePenerbangan?: 'DIRECT' | 'TRANSIT';
  statusTiket?: string;
  flightItinerary?: string;
}

export type RoomType = 'Single' | 'Double' | 'Triple' | 'Quad' | 'Quint' | 'Jr Suite (4pax)' | 'Jr Suite (2pax)' | 'Family Suite (4pax)' | '3 Bed Suite (6pax)' | 'Two Bedroom (10 Pax)' | 'Four Bedroom (15 Pax)';

export interface PriceEntry {
  roomType: RoomType | string;
  price: number;
}

export interface Season {
  range: string;
  prices: PriceEntry[];
}

export interface Hotel {
  id: string;
  name: string;
  city: 'Makkah' | 'Madinah' | string;
  vendor: string;
  mealPlan: 'FB' | 'HB' | 'RO' | 'BB' | string;
  stars?: number;
  bintang?: number;
  photo?: string;
  seasons: Season[];
}

export interface WizardHotel extends Partial<Hotel> {
  id: string;
  nama: string;
  kota: string;
  bintang: number;
  priceQuad: number;
  priceTriple: number;
  priceDouble: number;
  seasons: Season[];
}

export interface LayananOption {
  id: string;
  label: string;
  price: number;
}

export interface Layanan {
  id: string;
  nama: string;
  deskripsi: string;
  harga?: number;
  isGroup?: boolean;
  options?: LayananOption[];
}

export interface Bandara {
  id: string;
  nama: string;
  kode: string;
  kota: string;
  negara: string;
}

export interface PaketWisata {
  id: string;
  nama: string;
  deskripsi: string;
  durasiHari: number;
  lokasi: string;
  img: string;
  hargaStart: number;
}

export interface VisaData {
  id: string;
  vendorName: string;
  foreignPriceUsd: number;
  paxRange: string;
  exchangeRate: number;
  sellingPrice: number;
  vendorPrice: number;
  margin: number;
  percentage: number;
}

export interface PaketMaster extends WizardFormData {
  id: string;
}

export interface WizardFormData {
  kategori: string;
  nama: string;
  periode: string;
  durasiHari: number;
  statusTiket?: string;
  durasiWisata: number;
  negaraWisata: string;
  alurPerjalanan: string;
  kotaKeberangkatan: string;
  kotaTujuan: string;
  urutanKunjungan: string;
  tglBerangkat: string;
  tglKepulangan: string;
  targetJamaah: number;
  preferredDepartureDate?: string;
  maskapaiId: string;
  hargaDasar: number;
  deskripsi: string;
  tipePublikasi: string;
  tipePenjualan: string;
  photoUtama: string | null;
  tipePenerbangan: string;
  kelasPenerbangan: string;
  estimasiHargaMaskapai: number;
  flightItinerary?: string;
  hotelMadinahId: string;
  chkInMadinah: string;
  durasiMadinah: number;
  chkOutMadinah: string;
  hotelMakkahId: string;
  chkInMakkah: string;
  durasiMakkah: number;
  chkOutMakkah: string;
  hotelWisataId: string;
  selectedLayanan: string[];
  selectedWisata: string[];
  marginBersih: number;
  ujrohPartner: number;
  markup: number;
  // Additional fields used in calculations or UI
  wisataAddon_tourLeader?: boolean;
  wisataAddon_tourLeaderCount?: number;
  wisataAddon_handling?: boolean;
  wisataAddon_travelKits?: boolean;
  wisataAddon_merch_koper?: boolean;
  wisataAddon_merch_slingbag?: boolean;
  wisataAddon_merch_kaos?: boolean;
  wisataAddon_merch_jaket?: boolean;
  wisataAddon_merch_tasserut?: boolean;
  wisataAddon_merch_topi?: boolean;
  wisataAddon_merch_spanduk?: boolean;
  wisataMargin?: number;
  status?: string;
  isPublished?: boolean;
  isDraft?: boolean;
  kursSar?: number;
  kursUsd?: number;
  mitraId?: string | null;
  paketWisataId?: string;
  kuota?: number;
  sisaKuota?: number;
  validationStatus?: string;
  hargaJualQuad?: number;
  hargaJualTriple?: number;
  hargaJualDouble?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  requestId?: string;
  hargaEkonomi?: number;
  biayaHandling?: number;
  wisataTierPax?: string;
  wisataAddon_handlingType?: string;
  isMarkupOnly?: boolean;
  paketMasterId?: string;
  namaPaketMitra?: string;
  isNewMarkup?: boolean;
  checklist?: {
    pasporTerkumpul: number;
    meningitisTerkumpul: number;
    biometrikSelesai: number;
    ktpKkTerkumpul: number;
    dpMasuk: number;
    pelunasanMasuk: number;
    statusTiket: 'Pending' | 'Booked' | 'Issued';
    statusHotelMakkah: 'Pending' | 'Booked' | 'Paid';
    statusHotelMadinah: 'Pending' | 'Booked' | 'Paid';
    statusVisa: 'Pending' | 'Proses Provider' | 'Issued';
    statusBus: 'Pending' | 'Booked' | 'Paid';
    koperDibagikan: number;
    statusManasik: 'Pending' | 'Jadwal Ditetapkan' | 'Selesai';
    statusSiskopatuh: 'Pending' | 'Proses' | 'Selesai';
    files?: {
      tiketPesawat?: string;
      hotelMakkah?: string;
      hotelMadinah?: string;
      visa?: string;
      bus?: string;
      manasik?: string;
      siskopatuh?: string;
    };
  };
}

export interface WizardHotel {
  id: string;
  nama: string;
  bintang: number;
  pricePerNight?: number;
}

export interface ShopOrder {
  id: string;
  jamaahId: string;
  jamaahName?: string;
  mitraId?: string | null;
  productName: string;
  productPrice: number;
  quantity: number;
  totalCost: number;
  paymentMethod: string;
  shippingVendor: string;
  shippingAddress: string;
  status: string;
  createdAt?: unknown;
  noResi?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'broadcast';
  targetId?: string; // Specific user UID
  targetRole: 'all' | 'broadcast' | 'mitra' | 'jamaah' | 'admin' | 'operasional';
  read: boolean;
  createdAt: string; // ISO String
  senderId?: string; // Sender UID if any
}

export interface BookingRecord {
  id: string;
  bookingId?: string;
  kodeBooking: string;
  uniqueCode: string;
  namaJamaah: string;
  nomorPassport?: string;
  nomor_paspor?: string;
  nik?: string;
  noHp?: string;
  paxType?: string;
  gender?: string;
  roomType?: string;
  customRoomType?: string;
  hotelType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  amountPaid?: number;
  totalCost?: number;
  packageId?: string;
  packageName?: string;
  mitraId?: string | null;
  nama_lengkap?: string;
  status?: string;
  createdAt?: unknown;
  
  // Manifest Form Specifics
  title?: string;
  nama_paspor?: string;
  no_paspor?: string;
  tgl_issue_paspor?: string;
  tgl_exp_paspor?: string;
  kota_paspor?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  kewarganegaraan?: string;
  nama_ayah?: string;
  alamat?: string;
  alamat_tinggal?: string;
  jenisKelamin?: 'L' | 'P' | string;
  filePassport?: string;
  fileKtp?: string;
  fileVaccine?: string;
  fileFoto?: string;
  file_paspor?: string;
  file_ktp?: string;
  file_kk?: string;
  file_buku_nikah?: string;
  file_foto?: string;
  docPassport?: string;
  docKtp?: string;
  docVaccine?: string;
  docFoto?: string;
  tglKeberangkatan?: string;
  tgl_keberangkatan?: string;

  // Additional payment / package fields
  paketNama?: string;
  paketLabel?: string;
  statusPembayaran?: 'Lunas' | 'DP' | 'Belum Bayar' | 'pending' | string;
  statusKeberangkatan?: string;
  totalHarga?: number;
  jumlahBayar?: number;
  
  // Perlengkapan shipping options
  opsi_perlengkapan?: 'Ambil di Kantor' | 'Kirim Ekspedisi' | string;
  penerima_perlengkapan?: string;
  telp_penerima_perlengkapan?: string;
  alamat_penerima_perlengkapan?: string;
  status_pengiriman_perlengkapan?: string;
}

export interface JamaahSession {
  id: string;
  bookingId?: string;
  kodeBooking: string;
  uniqueCode: string;
  namaJamaah: string;
  nomorPassport?: string;
}

export enum Type {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}

