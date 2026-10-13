"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const routingService_1 = require("../services/routingService");
const router = (0, express_1.Router)();
// POST /api/rides - Publish a Ride (Captain)
router.post('/', auth_1.requireAuth, auth_1.requireCaptain, async (req, res) => {
    const captainId = req.user.id;
    const originName = req.body.originName || req.body.pickupLocation;
    const originLat = req.body.originLat !== undefined ? Number(req.body.originLat) : (req.body.pickupLat !== undefined ? Number(req.body.pickupLat) : undefined);
    const originLng = req.body.originLng !== undefined ? Number(req.body.originLng) : (req.body.pickupLng !== undefined ? Number(req.body.pickupLng) : undefined);
    const destinationName = req.body.destinationName || req.body.destinationLocation;
    const destinationLat = req.body.destinationLat !== undefined ? Number(req.body.destinationLat) : (req.body.destLat !== undefined ? Number(req.body.destLat) : undefined);
    const destinationLng = req.body.destinationLng !== undefined ? Number(req.body.destinationLng) : (req.body.destLng !== undefined ? Number(req.body.destLng) : undefined);
    const { departureTime, departureDate, availableSeats = 1, totalSeats = 1, contributionAmount, maxDetourKm = 2.0, waypoints = [], note, } = req.body;
    if (!originName ||
        originLat === undefined ||
        originLng === undefined ||
        !destinationName ||
        destinationLat === undefined ||
        destinationLng === undefined ||
        !departureTime ||
        !departureDate ||
        contributionAmount === undefined) {
        res.status(400).json({ error: 'Missing required ride parameters.' });
        return;
    }
    // Check if Captain has a registered vehicle
    const vehicle = database_1.db.prepare('SELECT id, make, model, registration_number FROM vehicles WHERE user_id = ? LIMIT 1').get(captainId);
    if (!vehicle) {
        res.status(400).json({ error: 'Please register your motorcycle details before publishing a ride.' });
        return;
    }
    // Check conflicting active rides
    const conflicting = database_1.db.prepare(`
    SELECT id FROM rides 
    WHERE captain_id = ? AND departure_date = ? AND departure_time = ? AND status IN ('published', 'started')
  `).get(captainId, departureDate, departureTime);
    if (conflicting) {
        res.status(409).json({ error: 'You already have an active ride published for this date and departure time slot.' });
        return;
    }
    // Calculate real road route and polyline via routing engine
    const waypointCoords = waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
    const roadRoute = await (0, routingService_1.calculateRoadRoute)({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng }, waypointCoords);
    const rideId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO rides (
      id, captain_id, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng,
      departure_time, departure_date, available_seats, total_seats, contribution_amount, max_detour_km,
      route_polyline, distance_km, duration_minutes, status, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
  `).run(rideId, captainId, originName, originLat, originLng, destinationName, destinationLat, destinationLng, departureTime, departureDate, availableSeats, totalSeats, contributionAmount, maxDetourKm, JSON.stringify(roadRoute.polyline), roadRoute.distanceKm, roadRoute.durationMinutes, note || null);
    // Save intermediate waypoints
    for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const wpId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO ride_waypoints (id, ride_id, name, lat, lng, sequence_order, eta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(wpId, rideId, wp.name, wp.lat, wp.lng, i + 1, wp.eta || null);
    }
    res.status(201).json({
        message: 'Ride successfully published to Alliance Campus network.',
        rideId,
        distanceKm: roadRoute.distanceKm,
        durationMinutes: roadRoute.durationMinutes,
        provider: roadRoute.provider,
    });
});
// GET /api/rides/search - Real Ride Search
router.get('/search', async (req, res) => {
    const { pickup, destination, pickupLat, pickupLng, destLat, destLng, date, time } = req.query;
    // Fetch all open published rides
    const query = `
    SELECT 
      r.*,
      u.full_name as captain_name,
      u.rating as captain_rating,
      u.total_ratings as captain_total_ratings,
      u.is_verified as captain_verified,
      u.department as captain_department,
      u.avatar_url as captain_avatar,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.registration_number as vehicle_plate,
      v.color as vehicle_color,
      v.helmet_provided as vehicle_helmet
    FROM rides r
    JOIN users u ON r.captain_id = u.id
    LEFT JOIN vehicles v ON v.user_id = u.id
    WHERE r.status = 'published' AND r.available_seats > 0
    ORDER BY r.created_at DESC
  `;
    const rides = database_1.db.prepare(query).all();
    // If geographic coordinates provided, compute real route detour compatibility
    const results = [];
    const pLat = pickupLat ? parseFloat(pickupLat) : null;
    const pLng = pickupLng ? parseFloat(pickupLng) : null;
    const dLat = destLat ? parseFloat(destLat) : null;
    const dLng = destLng ? parseFloat(destLng) : null;
    for (const ride of rides) {
        let compatibilityScore = 95;
        let isCompatible = true;
        let detourKm = 0;
        if (pLat && pLng && dLat && dLng) {
            const match = (0, routingService_1.calculateRouteMatch)({ lat: ride.origin_lat, lng: ride.origin_lng }, { lat: ride.destination_lat, lng: ride.destination_lng }, { lat: pLat, lng: pLng }, { lat: dLat, lng: dLng }, ride.max_detour_km);
            isCompatible = match.isCompatible;
            compatibilityScore = match.compatibilityPercentage;
            detourKm = match.detourKm;
        }
        else if (pickup || destination) {
            // Text match fallback
            const matchOrigin = !pickup || ride.origin_name.toLowerCase().includes(pickup.toLowerCase());
            const matchDest = !destination || ride.destination_name.toLowerCase().includes(destination.toLowerCase());
            isCompatible = matchOrigin || matchDest;
        }
        if (isCompatible) {
            // Fetch waypoints
            const waypoints = database_1.db.prepare('SELECT * FROM ride_waypoints WHERE ride_id = ? ORDER BY sequence_order ASC').all(ride.id);
            results.push({
                id: ride.id,
                captainId: ride.captain_id,
                captain: {
                    id: ride.captain_id,
                    name: ride.captain_name,
                    rating: ride.captain_rating,
                    totalRatings: ride.captain_total_ratings,
                    isVerified: Boolean(ride.captain_verified),
                    department: ride.captain_department,
                    avatar: ride.captain_avatar,
                },
                vehicle: {
                    make: ride.vehicle_make,
                    model: ride.vehicle_model,
                    registrationNumber: ride.vehicle_plate,
                    color: ride.vehicle_color,
                    helmetProvided: Boolean(ride.vehicle_helmet),
                    verified: true,
                },
                pickupLocation: ride.origin_name,
                destinationLocation: ride.destination_name,
                pickupCoords: { lat: ride.origin_lat, lng: ride.origin_lng },
                destinationCoords: { lat: ride.destination_lat, lng: ride.destination_lng },
                waypoints,
                departureTime: ride.departure_time,
                departureDate: ride.departure_date,
                availableSeats: ride.available_seats,
                totalSeats: ride.total_seats,
                contributionAmount: ride.contribution_amount,
                distanceKm: ride.distance_km,
                durationMinutes: ride.duration_minutes,
                routePolyline: ride.route_polyline ? JSON.parse(ride.route_polyline) : [],
                routeCompatibility: compatibilityScore,
                detourKm,
                note: ride.note,
                status: ride.status,
            });
        }
    }
    res.json({ count: results.length, rides: results });
});
// GET /api/rides/captain/my-rides - Captain's Rides
router.get('/captain/my-rides', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const captainId = req.user.id;
    const rides = database_1.db.prepare(`
    SELECT r.*, COUNT(b.id) as booking_requests_count
    FROM rides r
    LEFT JOIN bookings b ON b.ride_id = r.id AND b.status IN ('pending', 'accepted')
    WHERE r.captain_id = ?
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all(captainId);
    const formatted = rides.map((r) => ({
        ...r,
        routePolyline: r.route_polyline ? JSON.parse(r.route_polyline) : [],
    }));
    res.json({ count: formatted.length, rides: formatted });
});
// GET /api/rides/:id - Ride Details
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const ride = database_1.db.prepare(`
    SELECT 
      r.*,
      u.full_name as captain_name,
      u.email as captain_email,
      u.phone as captain_phone,
      u.rating as captain_rating,
      u.total_ratings as captain_total_ratings,
      u.is_verified as captain_verified,
      u.university as captain_university,
      u.department as captain_department,
      u.avatar_url as captain_avatar,
      u.upi_id as captain_upi,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.registration_number as vehicle_plate,
      v.color as vehicle_color,
      v.helmet_provided as vehicle_helmet
    FROM rides r
    JOIN users u ON r.captain_id = u.id
    LEFT JOIN vehicles v ON v.user_id = u.id
    WHERE r.id = ?
  `).get(id);
    if (!ride) {
        res.status(404).json({ error: 'Ride not found.' });
        return;
    }
    const waypoints = database_1.db.prepare('SELECT * FROM ride_waypoints WHERE ride_id = ? ORDER BY sequence_order ASC').all(id);
    res.json({
        id: ride.id,
        captain: {
            id: ride.captain_id,
            name: ride.captain_name,
            email: ride.captain_email,
            phone: ride.captain_phone,
            rating: ride.captain_rating,
            totalRatings: ride.captain_total_ratings,
            isVerified: Boolean(ride.captain_verified),
            university: ride.captain_university,
            department: ride.captain_department,
            avatar: ride.captain_avatar,
            upiId: ride.captain_upi,
        },
        vehicle: {
            make: ride.vehicle_make,
            model: ride.vehicle_model,
            registrationNumber: ride.vehicle_plate,
            color: ride.vehicle_color,
            helmetProvided: Boolean(ride.vehicle_helmet),
            verified: true,
        },
        pickupLocation: ride.origin_name,
        destinationLocation: ride.destination_name,
        pickupCoords: { lat: ride.origin_lat, lng: ride.origin_lng },
        destinationCoords: { lat: ride.destination_lat, lng: ride.destination_lng },
        waypoints,
        departureTime: ride.departure_time,
        departureDate: ride.departure_date,
        availableSeats: ride.available_seats,
        totalSeats: ride.total_seats,
        contributionAmount: ride.contribution_amount,
        distanceKm: ride.distance_km,
        durationMinutes: ride.duration_minutes,
        routePolyline: ride.route_polyline ? JSON.parse(ride.route_polyline) : [],
        note: ride.note,
        status: ride.status,
    });
});
// PATCH /api/rides/:id/cancel
router.patch('/:id/cancel', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const { id } = req.params;
    const captainId = req.user.id;
    const ride = database_1.db.prepare('SELECT id, status FROM rides WHERE id = ? AND captain_id = ?').get(id, captainId);
    if (!ride) {
        res.status(404).json({ error: 'Ride not found or unauthorized.' });
        return;
    }
    if (ride.status === 'completed' || ride.status === 'cancelled') {
        res.status(400).json({ error: `Cannot cancel a ride with status '${ride.status}'.` });
        return;
    }
    database_1.db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(id);
    database_1.db.prepare("UPDATE bookings SET status = 'cancelled' WHERE ride_id = ?").run(id);
    res.json({ message: 'Ride successfully cancelled.' });
});
exports.default = router;
