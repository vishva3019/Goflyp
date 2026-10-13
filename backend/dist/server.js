"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./db/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const rideRoutes_1 = __importDefault(require("./routes/rideRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const tripRoutes_1 = __importDefault(require("./routes/tripRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const geoRoutes_1 = __importDefault(require("./routes/geoRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '5050', 10);
// Initialize SQLite Schema
(0, database_1.initDatabase)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/rides', rideRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/trips', tripRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/geo', geoRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
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
exports.default = app;
