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

export const visaData: VisaData[] = [
  {
    id: 'visa-1',
    vendorName: '-',
    foreignPriceUsd: 137,
    paxRange: '1-34 PAX',
    exchangeRate: 17000,
    sellingPrice: 2492030,
    vendorPrice: 2329000,
    margin: 163030,
    percentage: 7
  },
  {
    id: 'visa-2',
    vendorName: '-',
    foreignPriceUsd: 145,
    paxRange: '35-55 PAX',
    exchangeRate: 17000,
    sellingPrice: 2637550,
    vendorPrice: 2465000,
    margin: 172550,
    percentage: 7
  }
];
