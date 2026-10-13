"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERIFIED_CAMPUS_PLACES = void 0;
exports.searchLocations = searchLocations;
exports.reverseGeocodeLocation = reverseGeocodeLocation;
const campus_1 = require("../config/campus");
// Verified real geographic coordinates for Alliance University campus & corridors
exports.VERIFIED_CAMPUS_PLACES = [
    {
        id: 'alliance_gate_1',
        name: campus_1.ALLIANCE_CAMPUS_NAME,
        address: campus_1.ALLIANCE_CAMPUS_ADDRESS,
        lat: campus_1.ALLIANCE_CAMPUS_LAT,
        lng: campus_1.ALLIANCE_CAMPUS_LNG,
        isCampusLocation: true,
    },
    {
        id: 'alliance_library',
        name: 'Alliance Central Library & Learning Hub',
        address: 'Central Campus Quadrangle, Alliance University',
        lat: 12.7295,
        lng: 77.7082,
        isCampusLocation: true,
    },
    {
        id: 'alliance_hostel_b',
        name: 'Hostel Block B & Student Cafeteria',
        address: 'North Residential Zone, Alliance University',
        lat: 12.7305,
        lng: 77.7075,
        isCampusLocation: true,
    },
    {
        id: 'alliance_asob',
        name: 'Alliance School of Business (ASOB)',
        address: 'Academic Block 2, Alliance University',
        lat: 12.7290,
        lng: 77.7085,
        isCampusLocation: true,
    },
    {
        id: 'hub_chandapura',
        name: 'Chandapura Circle Flyover Junction',
        address: 'Chandapura, Hosur Road Corridor, Bengaluru',
        lat: 12.7954,
        lng: 77.6989,
        isCampusLocation: false,
    },
    {
        id: 'hub_ecity_metro',
        name: 'Electronic City Metro Station (Phase 1)',
        address: 'Yellow Line Corridor, Electronic City, Bengaluru',
        lat: 12.8452,
        lng: 77.6602,
        isCampusLocation: false,
    },
    {
        id: 'hub_bommasandra_metro',
        name: 'Bommasandra Metro Terminal Station',
        address: 'Hebbagodi - Bommasandra Industrial Area, Bengaluru',
        lat: 12.8184,
        lng: 77.6872,
        isCampusLocation: false,
    },
    {
        id: 'hub_kudlu_gate',
        name: 'Kudlu Gate Bus Stop Junction',
        address: 'Hosur Main Road, Bengaluru',
        lat: 12.8876,
        lng: 77.6441,
        isCampusLocation: false,
    },
    {
        id: 'hub_silk_board',
        name: 'Central Silk Board Interchange',
        address: 'Outer Ring Road / Hosur Road Junction, Bengaluru',
        lat: 12.9172,
        lng: 77.6227,
        isCampusLocation: false,
    },
    {
        id: 'hub_koramangala',
        name: 'Koramangala 5th Block Junction',
        address: 'Jyoti Nivas College Road, Koramangala, Bengaluru',
        lat: 12.9352,
        lng: 77.6245,
        isCampusLocation: false,
    },
];
/**
 * Searches real locations via Nominatim OSM or verified campus catalog
 */
async function searchLocations(query) {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery)
        return exports.VERIFIED_CAMPUS_PLACES.slice(0, 5);
    // Check verified campus places first
    const localMatches = exports.VERIFIED_CAMPUS_PLACES.filter((p) => p.name.toLowerCase().includes(cleanQuery) ||
        p.address.toLowerCase().includes(cleanQuery));
    if (localMatches.length >= 3) {
        return localMatches;
    }
    // Query Nominatim OpenStreetMap API for South Bengaluru / Anekal area
    try {
        const encoded = encodeURIComponent(query + ' Bengaluru');
        const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=in&viewbox=77.5,13.0,77.8,12.7`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Goflyp-University-Mobility/2.0',
            },
        });
        clearTimeout(timeout);
        if (res.ok) {
            const data = (await res.json());
            const apiResults = data.map((item, idx) => ({
                id: `osm_${item.place_id || idx}`,
                name: item.display_name.split(',')[0],
                address: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                isCampusLocation: item.display_name.toLowerCase().includes('alliance'),
            }));
            // Combine local matches + API results
            const combined = [...localMatches, ...apiResults];
            // Deduplicate by name
            const unique = combined.filter((v, i, a) => a.findIndex((t) => t.name.toLowerCase() === v.name.toLowerCase()) === i);
            return unique.slice(0, 8);
        }
    }
    catch (err) {
        // Return verified campus places on network failure
    }
    return localMatches.length > 0 ? localMatches : exports.VERIFIED_CAMPUS_PLACES.slice(0, 4);
}
/**
 * Reverse geocodes coordinates to a human-readable place name and address
 */
async function reverseGeocodeLocation(lat, lng) {
    // Check within 350m of verified campus places first
    for (const hub of exports.VERIFIED_CAMPUS_PLACES) {
        const dLat = (hub.lat - lat) * 111000;
        const dLng = (hub.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < 350) {
            return {
                name: hub.name,
                address: hub.address,
                lat,
                lng,
            };
        }
    }
    // Query Nominatim reverse geocode
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Goflyp-University-Mobility/2.0',
            },
        });
        clearTimeout(timeout);
        if (res.ok) {
            const data = (await res.json());
            if (data && data.display_name) {
                const parts = data.display_name.split(', ');
                const name = parts.slice(0, 2).join(', ');
                return {
                    name: name || 'Pin Location',
                    address: data.display_name,
                    lat,
                    lng,
                };
            }
        }
    }
    catch (err) {
        // Fallback on network timeout
    }
    return {
        name: `Pin Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng,
    };
}
