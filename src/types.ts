import { serverTimestamp } from './firebase';

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
  name: string;
  code: string;
  city: string;
}

export interface PaketWisata {
  id: string;
  nama: string;
  negara: string;
  lokasi: string;
  durasi: number;
  hargaDasar: number;
  hargaStart: number;
  deskripsi?: string;
  itinerary?: any[];
}

export interface WizardFormData {
  kategori: string;
  nama: string;
  periode: string;
  durasiHari: number;
  durasiWisata: number;
  negaraWisata: string;
  alurPerjalanan: string;
  kotaKeberangkatan: string;
  kotaTujuan: string;
  urutanKunjungan: string;
  tglBerangkat: string;
  tglKepulangan: string;
  targetJamaah: number;
  maskapaiId: string;
  hargaDasar: number;
  deskripsi: string;
  tipePublikasi: string;
  tipePenjualan: string;
  photoUtama: string | null;
  tipePenerbangan: string;
  kelasPenerbangan: string;
  estimasiHargaMaskapai: number;
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
  createdAt?: any;
  updatedAt?: any;
}
