import { Router, Response, Request } from 'express';
import { searchLocations, reverseGeocodeLocation } from '../services/geocodingService';
import { calculateRoadRoute } from '../services/routingService';

const router = Router();

// GET /api/geo/search?q=Alliance
router.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const places = await searchLocations(query);
  res.json({ places });
});

// GET /api/geo/reverse?lat=12.7298&lng=77.7088
router.get('/reverse', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
    return;
  }

  const result = await reverseGeocodeLocation(lat, lng);
  res.json(result);
});

// POST /api/geo/route
router.post('/route', async (req: Request, res: Response) => {
  const { origin, destination, waypoints = [] } = req.body;

  if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
    res.status(400).json({ error: 'Origin and destination with valid lat and lng are required.' });
    return;
  }

  const result = await calculateRoadRoute(origin, destination, waypoints);
  res.json(result);
});

export default router;
