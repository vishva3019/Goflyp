/**
 * Canonical Alliance University Campus Geolocation & Identity Configuration
 * Single source of truth across all Goflyp mobile app screens and routing services.
 * Real-world coordinates: Chikkahagade Cross, Chandapura - Anekal Main Road, Anekal, Bengaluru 562106
 */

export const CANONICAL_ALLIANCE_CAMPUS = {
  name: 'Alliance University Main Entrance Gate',
  shortName: 'Alliance University',
  address: 'Alliance University, Chandapura - Anekal Main Road, Chikkahagade, Anekal, Bengaluru, Karnataka 562106',
  lat: 12.7298,
  lng: 77.7088,
  geofenceRadiusMeters: 1500,
} as const;

export const ALLIANCE_CAMPUS_NAME = CANONICAL_ALLIANCE_CAMPUS.name;
export const ALLIANCE_CAMPUS_SHORT_NAME = CANONICAL_ALLIANCE_CAMPUS.shortName;
export const ALLIANCE_CAMPUS_ADDRESS = CANONICAL_ALLIANCE_CAMPUS.address;
export const ALLIANCE_CAMPUS_LAT = CANONICAL_ALLIANCE_CAMPUS.lat;
export const ALLIANCE_CAMPUS_LNG = CANONICAL_ALLIANCE_CAMPUS.lng;
export const ALLIANCE_CAMPUS_GEOFENCE_RADIUS_METERS = CANONICAL_ALLIANCE_CAMPUS.geofenceRadiusMeters;
