import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import authRoutes from './routes/authRoutes';
import rideRoutes from './routes/rideRoutes';
import bookingRoutes from './routes/bookingRoutes';
import tripRoutes from './routes/tripRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import geoRoutes from './routes/geoRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5050', 10);

// Initialize SQLite Schema
initDatabase();

app.use(cors());
app.use(express.json());

// Request logging in development (never logs credentials, passwords, tokens, or secrets)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      const statusIcon = res.statusCode >= 400 ? '⚠️' : '✓';
      console.log(`[API ${req.method}] ${req.originalUrl} -> ${res.statusCode} ${statusIcon} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/chat', chatRoutes);

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Goflyp Real Mobility Backend',
    version: '2.0.0',
    university: 'Alliance University',
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  // Listen on all network interfaces (dual-stack IPv6 & IPv4)
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`GOFLYP BACKEND ENGINE RUNNING ON PORT ${PORT} (Dual-Stack IPv4/IPv6)`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    console.log(`API Gateway:  http://localhost:${PORT}/api`);
    console.log(`=================================================\n`);
  });
}

export default app;
