export interface HandlingTier {
  minPax: number;
  maxPax: number;
  hpp: number;
}

export const HANDLING_TIERS: HandlingTier[] = [
  { minPax: 1, maxPax: 7, hpp: 249 },
  { minPax: 8, maxPax: 11, hpp: 136 },
  { minPax: 12, maxPax: 15, hpp: 98 },
  { minPax: 16, maxPax: 19, hpp: 79 },
  { minPax: 20, maxPax: 23, hpp: 68 },
  { minPax: 24, maxPax: 27, hpp: 60 },
  { minPax: 28, maxPax: 31, hpp: 55 },
  { minPax: 32, maxPax: 35, hpp: 51 },
  { minPax: 36, maxPax: 39, hpp: 48 },
  { minPax: 40, maxPax: 43, hpp: 45 },
  { minPax: 44, maxPax: 46, hpp: 43 },
];

export const HANDLING_CONSTANTS = {
  adminFee: 7,
  defaultKurs: 17000,
  defaultMarginPercent: 30,
};
