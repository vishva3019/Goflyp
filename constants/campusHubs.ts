import {
  ALLIANCE_CAMPUS_NAME,
  ALLIANCE_CAMPUS_ADDRESS,
  ALLIANCE_CAMPUS_LAT,
  ALLIANCE_CAMPUS_LNG,
} from './campus';

export interface CampusHub {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isCampusGate: boolean;
}

export const VERIFIED_CAMPUS_HUBS: CampusHub[] = [
  {
    id: 'alliance_gate_1',
    name: ALLIANCE_CAMPUS_NAME,
    address: ALLIANCE_CAMPUS_ADDRESS,
    lat: ALLIANCE_CAMPUS_LAT,
    lng: ALLIANCE_CAMPUS_LNG,
    isCampusGate: true,
  },
  {
    id: 'alliance_library',
    name: 'Central Library & Innovation Hub',
    address: 'Central Campus Quadrangle, Alliance University',
    lat: 12.7295,
    lng: 77.7082,
    isCampusGate: true,
  },
  {
    id: 'alliance_hostel_b',
    name: 'Hostel Block B & Cafeteria',
    address: 'North Residential Zone, Alliance University',
    lat: 12.7305,
    lng: 77.7075,
    isCampusGate: true,
  },
  {
    id: 'alliance_asob',
    name: 'Alliance School of Business Gate',
    address: 'Academic Block 2, Alliance University',
    lat: 12.7290,
    lng: 77.7085,
    isCampusGate: true,
  },
  {
    id: 'hub_chandapura',
    name: 'Chandapura Circle Flyover Junction',
    address: 'Hosur Road Highway Junction, Chandapura',
    lat: 12.7954,
    lng: 77.6989,
    isCampusGate: false,
  },
  {
    id: 'hub_ecity_metro',
    name: 'Electronic City Metro Station (Phase 1)',
    address: 'Yellow Line Elevated Corridor, Electronic City',
    lat: 12.8452,
    lng: 77.6602,
    isCampusGate: false,
  },
  {
    id: 'hub_bommasandra_metro',
    name: 'Bommasandra Metro Terminal Station',
    address: 'Hebbagodi - Bommasandra Industrial Zone',
    lat: 12.8184,
    lng: 77.6872,
    isCampusGate: false,
  },
  {
    id: 'hub_kudlu_gate',
    name: 'Kudlu Gate Bus Stop Junction',
    address: 'Hosur Main Road, Bengaluru',
    lat: 12.8876,
    lng: 77.6441,
    isCampusGate: false,
  },
  {
    id: 'hub_silk_board',
    name: 'Central Silk Board Interchange',
    address: 'Outer Ring Road / Hosur Road Junction',
    lat: 12.9172,
    lng: 77.6227,
    isCampusGate: false,
  },
  {
    id: 'hub_koramangala',
    name: 'Koramangala 5th Block Junction',
    address: 'Jyoti Nivas College Road, Koramangala',
    lat: 12.9352,
    lng: 77.6245,
    isCampusGate: false,
  },
];

export const ALLIANCE_CAMPUS_HUBS = VERIFIED_CAMPUS_HUBS;
