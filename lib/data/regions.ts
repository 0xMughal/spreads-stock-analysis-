export type RegionKey = 'all' | 'us' | 'uk' | 'europe' | 'japan' | 'korea' | 'asia' | 'americas'

export interface RegionDef {
  key: RegionKey
  label: string
  countries: string[]
}

export const REGIONS: RegionDef[] = [
  { key: 'all', label: 'Global', countries: [] },
  { key: 'us', label: 'US', countries: ['US'] },
  { key: 'uk', label: 'UK', countries: ['United Kingdom'] },
  { key: 'japan', label: 'Japan', countries: ['Japan'] },
  { key: 'korea', label: 'Korea', countries: ['South Korea'] },
  {
    key: 'europe',
    label: 'Europe',
    countries: [
      'United Kingdom', 'Germany', 'France', 'Switzerland', 'Netherlands',
      'Italy', 'Denmark', 'Sweden', 'Spain', 'Ireland', 'Portugal', 'Norway',
    ],
  },
  {
    key: 'asia',
    label: 'Asia Pacific',
    countries: [
      'Japan', 'China', 'South Korea', 'Taiwan', 'India', 'Australia',
      'Singapore', 'Thailand', 'Indonesia',
    ],
  },
  {
    key: 'americas',
    label: 'Americas',
    countries: [
      'Canada', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Colombia', 'Peru',
    ],
  },
]

export function getRegionForCountry(country: string): RegionKey {
  for (const region of REGIONS) {
    if (region.countries.includes(country)) return region.key
  }
  return 'us'
}
