export interface Transaction {
  id: string;
  date: string; // ISO date string when saved
  namaPaket: string;
  namaTravel: string;
  tglKeberangkatan: string;
  jumlahPax: number;
  totalOmzet: number; // Total Harga Jual
  totalHpp: number; // Total Harga Modal
  totalProfit: number; // Laba Bersih
  biayaTambahan?: number; // Biaya tak terduga di lapangan
  catatan?: string; // Alasan perubahan
}
