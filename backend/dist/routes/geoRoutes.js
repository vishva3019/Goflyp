"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geocodingService_1 = require("../services/geocodingService");
const routingService_1 = require("../services/routingService");
const router = (0, express_1.Router)();
// GET /api/geo/search?q=Alliance
router.get('/search', async (req, res) => {
    const query = req.query.q || '';
    const places = await (0, geocodingService_1.searchLocations)(query);
    res.json({ places });
});
// GET /api/geo/reverse?lat=12.7298&lng=77.7088
router.get('/reverse', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
        return;
    }
    const result = await (0, geocodingService_1.reverseGeocodeLocation)(lat, lng);
    res.json(result);
});
// POST /api/geo/route
router.post('/route', async (req, res) => {
    const { origin, destination, waypoints = [] } = req.body;
    if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
        res.status(400).json({ error: 'Origin and destination with valid lat and lng are required.' });
        return;
    }
    const result = await (0, routingService_1.calculateRoadRoute)(origin, destination, waypoints);
    res.json(result);
});
exports.default = router;
