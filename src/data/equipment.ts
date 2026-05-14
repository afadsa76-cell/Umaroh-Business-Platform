export interface EquipmentItem {
  id: string;
  name: string;
  basePrice: number;
  margin17: number;
  sellingPrice: number;
  roundedPrice: number;
}

export const equipmentData: EquipmentItem[] = [
  {
    id: 'full-logo',
    name: 'FULL PERLENGKAPAN + LOGO',
    basePrice: 1085500,
    margin17: 184535,
    sellingPrice: 1270035,
    roundedPrice: 1300000
  },
  {
    id: 'aksesoris-mukena-ihram-traveling',
    name: 'AKSESORIS + MUKENA / IHRAM/TRAVELING KIT',
    basePrice: 553500,
    margin17: 94095,
    sellingPrice: 647595,
    roundedPrice: 650000
  },
  {
    id: 'aksesoris-mukena-ihram',
    name: 'AKSESORIS + MUKENA / IHRAM',
    basePrice: 383500,
    margin17: 65195,
    sellingPrice: 448695,
    roundedPrice: 550000
  },
  {
    id: 'aksesoris-traveling',
    name: 'AKSESORIS + TRAVELING KIT',
    basePrice: 440500,
    margin17: 74885,
    sellingPrice: 515385,
    roundedPrice: 550000
  },
  {
    id: 'aksesoris',
    name: 'AKSESORIS',
    basePrice: 270500,
    margin17: 45985,
    sellingPrice: 316485,
    roundedPrice: 350000
  },
  {
    id: 'full',
    name: 'FULL PERLENGKAPAN',
    basePrice: 1055500,
    margin17: 179435,
    sellingPrice: 1234935,
    roundedPrice: 1250000
  }
];
