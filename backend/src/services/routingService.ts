export interface RouteResult {
  polyline: { lat: number; lng: number }[];
  coordinates: { lat: number; lng: number }[];
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  provider: 'osrm' | 'unavailable';
  error?: string;
}

export interface RouteMatchResult {
  isCompatible: boolean;
  detourKm: number;
  pickupWalkDistanceMeters: number;
  compatibilityPercentage: number;
}

export function isValidCoordinate(coord: any): boolean {
  return (
    coord !== null &&
    coord !== undefined &&
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

/**
 * Calculates real road-following route using OSRM routing engine.
 * Never fabricates straight lines or invented fake curves when service is offline.
 */
export async function calculateRoadRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[] = []
): Promise<RouteResult> {
  // Validate geographic coordinate bounds
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return {
      polyline: [],
      coordinates: [],
      distanceMeters: 0,
      durationSeconds: 0,
      distanceKm: 0,
      durationMinutes: 0,
      provider: 'unavailable',
      error: 'Invalid coordinates provided. Latitude must be between -90 and 90, and longitude between -180 and 180.',
    };
  }

  const validWaypoints = (waypoints || []).filter(isValidCoordinate);

  const osrmBaseUrl = process.env.OSRM_ROUTING_URL || 'https://router.project-osrm.org';

  // Construct coordinates sequence: origin -> waypoints -> destination
  // Note: OSRM uses {lng},{lat} order
  const allPoints = [origin, ...validWaypoints, destination];
  const coordString = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${osrmBaseUrl}/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Goflyp-University-Mobility/2.0',
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as any;
      if (data.routes && data.routes.length > 0) {
        const primaryRoute = data.routes[0];
        const coordinates = primaryRoute.geometry.coordinates as [number, number][];

        const polyline = coordinates.map(([lng, lat]) => ({ lat, lng }));
        const distanceMeters = Math.round(primaryRoute.distance || 0);
        const durationSeconds = Math.round(primaryRoute.duration || 0);
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

        return {
          polyline,
          coordinates: polyline,
          distanceMeters,
          durationSeconds,
          distanceKm,
          durationMinutes,
          provider: 'osrm',
        };
      }
    }

    return {
      polyline: [],
      coordinates: [],
      distanceMeters: 0,
      durationSeconds: 0,
      distanceKm: 0,
      durationMinutes: 0,
      provider: 'unavailable',
      error: 'OSRM routing engine returned no route for the requested points.',
    };
  } catch (error: any) {
    // Network failure or timeout: return truthful error state without inventing fake roads
    return {
      polyline: [],
      coordinates: [],
      distanceMeters: 0,
      durationSeconds: 0,
      distanceKm: 0,
      durationMinutes: 0,
      provider: 'unavailable',
      error: `Road routing service unreachable (${error.name === 'AbortError' ? 'timeout' : 'network offline'}). No fake route rendered.`,
    };
  }
}

export function haversineDistanceMeters(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates route detour compatibility for a Rider wanting to join a Captain's route
 */
export function calculateRouteMatch(
  captainOrigin: { lat: number; lng: number },
  captainDestination: { lat: number; lng: number },
  riderPickup: { lat: number; lng: number },
  riderDropoff: { lat: number; lng: number },
  maxAllowedDetourKm: number = 2.5
): RouteMatchResult {
  const baseDistanceMeters = haversineDistanceMeters(captainOrigin, captainDestination);
  
  // Detour with rider pickup & dropoff
  const detourDistanceMeters =
    haversineDistanceMeters(captainOrigin, riderPickup) +
    haversineDistanceMeters(riderPickup, riderDropoff) +
    haversineDistanceMeters(riderDropoff, captainDestination);

  const detourExtraMeters = Math.max(0, detourDistanceMeters - baseDistanceMeters);
  const detourKm = Math.round((detourExtraMeters / 1000) * 10) / 10;
  const pickupWalkMeters = Math.round(haversineDistanceMeters(captainOrigin, riderPickup));

  const isCompatible = detourKm <= maxAllowedDetourKm;

  // Compatibility score: 100% minus penalty for extra detour
  const penalty = Math.min(60, (detourKm / maxAllowedDetourKm) * 35);
  const compatibilityPercentage = Math.max(40, Math.round(100 - penalty));

  return {
    isCompatible,
    detourKm,
    pickupWalkDistanceMeters: pickupWalkMeters,
    compatibilityPercentage,
  };
}
