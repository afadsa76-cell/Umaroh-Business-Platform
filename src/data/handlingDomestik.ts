export interface HandlingDomestik {
  id: string;
  item: string;
  hargaJual: number;
  hargaBeli: number;
}

export const handlingDomestikData: HandlingDomestik[] = [
  {
    id: 'hd1',
    item: 'BAGASI PP + LOUNGE KEBERANGKATAN ZUKAVIA',
    hargaJual: 350000,
    hargaBeli: 250000,
  },
  {
    id: 'hd2',
    item: 'BAGASI PP + NASI BOX KEBERANGKATAN',
    hargaJual: 250000,
    hargaBeli: 150000,
  },
  {
    id: 'hd3',
    item: 'BAGASI PP + SNACK KEBERANGKATAN',
    hargaJual: 200000,
    hargaBeli: 135000,
  }
];
