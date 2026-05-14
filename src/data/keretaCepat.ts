export interface KeretaCepat {
  id: string;
  item: string;
  hargaAsing: number;
  mataUang: string;
  hargaJual: number;
  hargaBeli: number;
  margin: number;
  persen: number;
}

export const keretaCepatData: KeretaCepat[] = [
  {
    id: 'kc-1',
    item: 'MADINAH - MEKKAH + ADD ON BUS',
    hargaAsing: 287,
    mataUang: 'SAR',
    hargaJual: 1483790,
    hargaBeli: 1348900,
    margin: 134890,
    persen: 10
  }
];
