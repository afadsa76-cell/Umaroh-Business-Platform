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
    exchangeRate: 20000,
    sellingPrice: 2928300,
    vendorPrice: 2740000,
    margin: 188300,
    percentage: 7
  },
  {
    id: 'visa-2',
    vendorName: '-',
    foreignPriceUsd: 145,
    paxRange: '35-55 PAX',
    exchangeRate: 20000,
    sellingPrice: 3099350,
    vendorPrice: 2900000,
    margin: 199350,
    percentage: 7
  }
];
