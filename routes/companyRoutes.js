/**
 * routes/companyRoutes.js
 * Express router for the Company Data Enrichment API.
 */
import { Router } from 'express';
import {
    enrichSingle,
    enrichBulk,
    getEnrichmentStatus,
    exportExcel,
    getEnrichedCompanies,
} from '../controllers/companyController.js';

const router = Router();

// ── Single company enrichment ────────────────────────────────────────────────
// GET /api/enrich-company?name=CompanyName&exhibition=Plastindia&booth=A101
router.get('/enrich-company', enrichSingle);

// ── Bulk company enrichment ──────────────────────────────────────────────────
// POST /api/enrich-bulk
// Body: { companies: [{ companyName, exhibition?, boothNumber?, website? }] }
router.post('/enrich-bulk', enrichBulk);

// ── Enrichment status check ──────────────────────────────────────────────────
// GET /api/enrich-status          → overall queue stats
// GET /api/enrich-status?jobId=X  → single job status
router.get('/enrich-status', getEnrichmentStatus);

// ── Excel export ─────────────────────────────────────────────────────────────
// GET /api/export/excel
// GET /api/export/excel?exhibition=Plastindia&status=completed
router.get('/export/excel', exportExcel);

// ── List enriched companies ──────────────────────────────────────────────────
// GET /api/companies/enriched?page=1&limit=100&search=xyz&exhibition=IMTEX
router.get('/companies/enriched', getEnrichedCompanies);

export default router;
