import type { BayAreaCity } from "@/types";

export const bayAreaCities: BayAreaCity[] = [
  // Santa Clara County
  { name: "Campbell", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1650000 },
  { name: "San Jose", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 3.30, historicalAppreciation: 0.05, medianHomePrice: 1200000 },
  { name: "Santa Clara", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1500000 },
  { name: "Cupertino", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 2800000 },
  { name: "Sunnyvale", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2000000 },
  { name: "Mountain View", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 3.30, historicalAppreciation: 0.06, medianHomePrice: 2200000 },
  { name: "Palo Alto", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 3.30, historicalAppreciation: 0.06, medianHomePrice: 3500000 },
  { name: "Los Altos", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 4000000 },
  { name: "Los Gatos", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2500000 },
  { name: "Saratoga", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 3800000 },
  { name: "Milpitas", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1350000 },
  { name: "Morgan Hill", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Gilroy", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 900000 },
  // San Mateo County
  { name: "Redwood City", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1800000 },
  { name: "San Mateo", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1700000 },
  { name: "Foster City", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1900000 },
  { name: "Burlingame", county: "San Mateo", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2300000 },
  { name: "San Carlos", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2200000 },
  { name: "Menlo Park", county: "San Mateo", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 2800000 },
  { name: "Half Moon Bay", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1600000 },
  { name: "Daly City", county: "San Mateo", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "South San Francisco", county: "San Mateo", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1150000 },
  { name: "Pacifica", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1300000 },
  // Alameda County
  { name: "Fremont", county: "Alameda", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1400000 },
  { name: "Hayward", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 8.50, historicalAppreciation: 0.04, medianHomePrice: 850000 },
  { name: "Oakland", county: "Alameda", propertyTaxRate: 0.0140, transferTaxRate: 15.00, historicalAppreciation: 0.04, medianHomePrice: 850000 },
  { name: "Berkeley", county: "Alameda", propertyTaxRate: 0.0135, transferTaxRate: 15.00, historicalAppreciation: 0.05, medianHomePrice: 1400000 },
  { name: "Union City", county: "Alameda", propertyTaxRate: 0.0128, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Newark", county: "Alameda", propertyTaxRate: 0.0128, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1050000 },
  { name: "Pleasanton", county: "Alameda", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1600000 },
  { name: "Livermore", county: "Alameda", propertyTaxRate: 0.0122, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1050000 },
  { name: "Dublin", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1300000 },
  { name: "San Leandro", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 6.00, historicalAppreciation: 0.04, medianHomePrice: 800000 },
  { name: "Alameda", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 12.00, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  // Contra Costa County
  { name: "Walnut Creek", county: "Contra Costa", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Concord", county: "Contra Costa", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 750000 },
  { name: "Pleasant Hill", county: "Contra Costa", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 950000 },
  { name: "Martinez", county: "Contra Costa", propertyTaxRate: 0.0122, transferTaxRate: 0, historicalAppreciation: 0.03, medianHomePrice: 700000 },
  { name: "San Ramon", county: "Contra Costa", propertyTaxRate: 0.0130, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1500000 },
  { name: "Danville", county: "Contra Costa", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1800000 },
  // San Francisco
  { name: "San Francisco", county: "San Francisco", propertyTaxRate: 0.0118, transferTaxRate: 6.80, historicalAppreciation: 0.04, medianHomePrice: 1400000 },
  // Santa Cruz County
  { name: "Santa Cruz", county: "Santa Cruz", propertyTaxRate: 0.0110, transferTaxRate: 1.10, historicalAppreciation: 0.04, medianHomePrice: 1200000 },
  { name: "Scotts Valley", county: "Santa Cruz", propertyTaxRate: 0.0108, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1300000 },
  { name: "Capitola", county: "Santa Cruz", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1150000 },
  { name: "Watsonville", county: "Santa Cruz", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.03, medianHomePrice: 750000 },
];

export function getCityByName(name: string): BayAreaCity | undefined {
  return bayAreaCities.find((c) => c.name === name);
}

export function getCitiesByCounty(county: string): BayAreaCity[] {
  return bayAreaCities.filter((c) => c.county === county);
}

export const counties = [...new Set(bayAreaCities.map((c) => c.county))];
