/**
 * enrichment-server.js
 * Standalone Express server for the Company Data Enrichment API.
 *
 * Runs on port 4000 (configurable via ENRICH_PORT env var) alongside
 * the main ExpoDirectory server (port 3000).
 *
 * Features:
 *   - Single company enrichment   → GET  /api/enrich-company?name=X
 *   - Bulk company enrichment     → POST /api/enrich-bulk
 *   - Enrichment status check     → GET  /api/enrich-status
 *   - Excel export                → GET  /api/export/excel
 *   - Paginated enriched listing  → GET  /api/companies/enriched
 *
 * Stack: Express + MongoDB + BullMQ/Redis + Puppeteer
 */

import express from 'express';
import cors from 'cors';
import { connectDB, getConnectionStatus } from './config/db.js';
import companyRoutes from './routes/companyRoutes.js';
import { startEnrichmentWorker } from './queues/enrichmentWorker.js';
import { closeBrowserPool } from './services/websiteScraper.js';

const app = express();
const PORT = parseInt(process.env.ENRICH_PORT || '4000', 10);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Dynamic import because express-rate-limit may not be installed yet
try {
    const { default: rateLimit } = await import('express-rate-limit');
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,    // 15 minutes
        max: 100,                     // 100 requests per window per IP
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many requests. Please try again in 15 minutes.',
        },
    });
    app.use('/api/', limiter);
    console.log('🛡️  Rate limiting enabled: 100 req / 15 min per IP');
} catch {
    console.warn('⚠️  express-rate-limit not installed — running without rate limiting.');
    console.warn('   Install it with: npm install express-rate-limit');
}

// ── Request logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        if (req.path.startsWith('/api/')) {
            console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
        }
    });
    next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', companyRoutes);

// Health check
app.get('/health', (req, res) => {
    const db = getConnectionStatus();
    res.json({
        status: 'ok',
        service: 'ExpoDirectory Enrichment System',
        uptime: Math.floor(process.uptime()) + 's',
        database: db,
        timestamp: new Date().toISOString(),
    });
});

// Root redirect
app.get('/', (req, res) => {
    res.json({
        service: 'ExpoDirectory Company Data Enrichment System',
        version: '1.0.0',
        endpoints: {
            'GET  /api/enrich-company?name=X': 'Enrich a single company',
            'POST /api/enrich-bulk': 'Bulk enrich companies (async via BullMQ)',
            'GET  /api/enrich-status': 'Check enrichment queue status',
            'GET  /api/export/excel': 'Export enriched data to Excel',
            'GET  /api/companies/enriched': 'List enriched companies (paginated)',
            'GET  /health': 'Health check',
        },
    });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? undefined : err.message,
    });
});

// ── Startup ──────────────────────────────────────────────────────────────────
async function start() {
    console.log('\n' + '═'.repeat(60));
    console.log('  ExpoDirectory — Company Data Enrichment System');
    console.log('═'.repeat(60) + '\n');

    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start BullMQ worker
    startEnrichmentWorker();

    // 3. Start Express server
    app.listen(PORT, () => {
        console.log(`\n🚀 Enrichment server running on http://localhost:${PORT}`);
        console.log(`📍 Health: http://localhost:${PORT}/health`);
        console.log(`📍 Enrich: http://localhost:${PORT}/api/enrich-company?name=YourCompany`);
        console.log(`📍 Bulk:   POST http://localhost:${PORT}/api/enrich-bulk`);
        console.log(`📍 Export: http://localhost:${PORT}/api/export/excel\n`);
    });
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await closeBrowserPool();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch(err => {
    console.error('❌ Failed to start enrichment server:', err);
    process.exit(1);
});
