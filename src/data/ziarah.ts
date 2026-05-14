export interface Ziarah {
  id: string;
  item: string;
  jumlahPax: number;
  hargaAsing: number;
  currency: string;
  hargaJual: number;
  hargaBeli: number;
}

export const ziarahData: Ziarah[] = [
  {
    id: 'z1',
    item: 'JABAL KHANDAMAH + SNACK BUS',
    jumlahPax: 45,
    hargaAsing: 850,
    currency: 'SAR',
    hargaJual: 106533,
    hargaBeli: 88778,
  },
  {
    id: 'z2',
    item: 'AL ULA MADINAH + SNACK BUS',
    jumlahPax: 45,
    hargaAsing: 2000,
    currency: 'SAR',
    hargaJual: 417778,
    hargaBeli: 208889,
  },
  {
    id: 'z3',
    item: 'JABAL MAGNET & PERCETAKAN QURAN + SNACK',
    jumlahPax: 45,
    hargaAsing: 700,
    currency: 'SAR',
    hargaJual: 212022,
    hargaBeli: 73111,
  },
  {
    id: 'z4',
    item: 'THAIF + SNACK NASI MANDI',
    jumlahPax: 30,
    hargaAsing: 1500,
    currency: 'SAR',
    hargaJual: 470000,
    hargaBeli: 235000,
  }
];
