export interface Manasik {
  id: string;
  item: string;
  hargaJual: number;
  hargaBeli: number;
}

export const manasikData: Manasik[] = [
  {
    id: 'm1',
    item: 'ONLINE',
    hargaJual: 50000,
    hargaBeli: 0,
  },
  {
    id: 'm2',
    item: 'OFFLINE',
    hargaJual: 200000,
    hargaBeli: 200000,
  }
];
