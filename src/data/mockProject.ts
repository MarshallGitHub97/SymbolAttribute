import type { Gebaeude } from '../types';

export const mockGebaeude: Gebaeude = {
  id: 'g1',
  name: 'Einfamilienhaus Muster',
  stockwerke: [
    {
      id: 'sw-eg',
      name: 'Erdgeschoss',
      raeume: [
        { id: 'r-wohn', name: 'Wohnzimmer' },
        { id: 'r-kueche', name: 'Küche' },
        { id: 'r-flur-eg', name: 'Flur EG' },
        { id: 'r-wc', name: 'Gäste-WC' },
      ],
    },
    {
      id: 'sw-og',
      name: 'Obergeschoss',
      raeume: [
        { id: 'r-schlaf', name: 'Schlafzimmer' },
        { id: 'r-kind1', name: 'Kinderzimmer 1' },
        { id: 'r-kind2', name: 'Kinderzimmer 2' },
        { id: 'r-bad', name: 'Badezimmer' },
        { id: 'r-flur-og', name: 'Flur OG' },
      ],
    },
    {
      id: 'sw-kg',
      name: 'Kellergeschoss',
      raeume: [
        { id: 'r-hwr', name: 'Hauswirtschaftsraum' },
        { id: 'r-keller', name: 'Keller' },
        { id: 'r-technik', name: 'Technikraum' },
      ],
    },
  ],
};
