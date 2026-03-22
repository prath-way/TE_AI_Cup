/**
 * controllers/companyController.js
 * Express request handlers for the enrichment API.
 */
import { enrichCompany, enrichBatch } from '../services/contactExtractor.js';
import enrichmentQueue from '../queues/enrichmentQueue.js';
import Company from '../models/Company.js';
import ExcelJS from 'exceljs';

/**
 * GET /api/enrich-company?name=CompanyName
 * Enriches a single company synchronously and returns the result.
 */
export async function enrichSingle(req, res) {
    try {
        const name = req.query.name?.trim();
        if (!name) {
            return res.status(400).json({ error: 'Query parameter "name" is required' });
        }

        console.log(`\n🔍 Enrich request: "${name}"`);

        const result = await enrichCompany({
            companyName: name,
            exhibition: req.query.exhibition || '',
            boothNumber: req.query.booth || '',
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error('Enrich single error:', err);
        res.status(500).json({ error: 'Enrichment failed', message: err.message });
    }
}

/**
 * POST /api/enrich-bulk
 * Body: { companies: [{ companyName, exhibition?, boothNumber?, website? }] }
 *
 * If Redis is available → queues jobs via BullMQ (async, scalable).
 * If Redis is down → falls back to direct in-process batch enrichment.
 */
export async function enrichBulk(req, res) {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({
                error: 'Request body must include "companies" array with at least one entry',
            });
        }

        console.log(`\n📦 Bulk enrichment request: ${companies.length} companies`);

        // ── Strategy 1: BullMQ queue (preferred) ─────────────────────────────
        if (enrichmentQueue) {
            const jobIds = [];

            for (const company of companies) {
                const job = await enrichmentQueue.add('enrich', {
                    companyName: company.companyName,
                    exhibition: company.exhibition || company.source || '',
                    boothNumber: company.boothNumber || company.booth || '',
                    website: company.website || company.companyLink || '',
                }, {
                    jobId: `enrich-${(company.companyName || '').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                });

                jobIds.push(job.id);

                // Mark as pending in DB
                try {
                    await Company.upsertEnriched({
                        companyName: company.companyName,
                        exhibition: company.exhibition || '',
                        boothNumber: company.boothNumber || '',
                        enrichmentStatus: 'pending',
                    });
                } catch { /* ignore DB errors */ }
            }

            return res.json({
                success: true,
                mode: 'queued',
                message: `${companies.length} companies queued for enrichment`,
                totalJobs: jobIds.length,
                jobIds: jobIds.slice(0, 10), // return first 10 for reference
                statusEndpoint: '/api/enrich-status',
            });
        }

        // ── Strategy 2: Direct batch enrichment (fallback) ───────────────────
        console.log('⚠️  Redis unavailable — running direct batch enrichment');
        const results = await enrichBatch(companies, 3, (current, total, result) => {
            console.log(`   ${current}/${total} — ${result.companyName}`);
        });

        return res.json({
            success: true,
            mode: 'direct',
            message: `${results.length} companies enriched directly`,
            count: results.length,
            data: results,
        });
    } catch (err) {
        console.error('Enrich bulk error:', err);
        res.status(500).json({ error: 'Bulk enrichment failed', message: err.message });
    }
}

/**
 * GET /api/enrich-status?jobId=X   (single job)
 * GET /api/enrich-status           (overall queue stats)
 *
 * Check the status of bulk enrichment jobs.
 */
export async function getEnrichmentStatus(req, res) {
    try {
        const { jobId } = req.query;

        // Single job status
        if (jobId && enrichmentQueue) {
            const job = await enrichmentQueue.getJob(jobId);
            if (!job) {
                return res.status(404).json({ error: `Job "${jobId}" not found` });
            }

            const state = await job.getState();
            return res.json({
                jobId: job.id,
                state,
                data: job.data,
                result: job.returnvalue || null,
                progress: job.progress,
                failedReason: job.failedReason || null,
            });
        }

        // Overall queue stats
        if (enrichmentQueue) {
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                enrichmentQueue.getWaitingCount(),
                enrichmentQueue.getActiveCount(),
                enrichmentQueue.getCompletedCount(),
                enrichmentQueue.getFailedCount(),
                enrichmentQueue.getDelayedCount(),
            ]);

            return res.json({
                queue: 'company-enrichment',
                stats: { waiting, active, completed, failed, delayed },
                total: waiting + active + completed + failed + delayed,
            });
        }

        // No queue available
        return res.json({
            queue: 'unavailable',
            message: 'Redis/BullMQ not connected. Use direct enrichment mode.',
        });
    } catch (err) {
        console.error('Status check error:', err);
        res.status(500).json({ error: 'Status check failed', message: err.message });
    }
}

/**
 * GET /api/export/excel
 * Exports all enriched companies from MongoDB to an Excel file.
 * Optional query: ?exhibition=Plastindia to filter by exhibition.
 */
export async function exportExcel(req, res) {
    try {
        const filter = {};
        if (req.query.exhibition) {
            filter.exhibition = new RegExp(req.query.exhibition, 'i');
        }
        // Only export completed enrichments (or all if no status filter)
        if (req.query.status) {
            filter.enrichmentStatus = req.query.status;
        }

        const companies = await Company.find(filter)
            .sort({ companyName: 1 })
            .lean();

        if (companies.length === 0) {
            return res.status(404).json({
                error: 'No enriched companies found',
                hint: 'Run enrichment first via POST /api/enrich-bulk or GET /api/enrich-company?name=CompanyName',
            });
        }

        console.log(`📊 Exporting ${companies.length} companies to Excel`);

        // ── Build Excel workbook ─────────────────────────────────────────────
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ExpoDirectory Enrichment System';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('Enriched Companies');

        ws.columns = [
            { header: 'Company Name', key: 'companyName', width: 40 },
            { header: 'Exhibition', key: 'exhibition', width: 25 },
            { header: 'Booth Number', key: 'boothNumber', width: 15 },
            { header: 'Website', key: 'website', width: 45 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Phone', key: 'phone', width: 22 },
            { header: 'Address', key: 'address', width: 50 },
            { header: 'LinkedIn', key: 'linkedin', width: 45 },
            { header: 'Source', key: 'source', width: 18 },
            { header: 'Last Updated', key: 'lastUpdated', width: 22 },
        ];

        // Style header
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F4E79' },
        };
        ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data rows
        companies.forEach((company, index) => {
            const row = ws.addRow({
                companyName: company.companyName || '',
                exhibition: company.exhibition || '',
                boothNumber: company.boothNumber || '',
                website: company.website || '',
                email: company.email || '',
                phone: String(company.phone || ''),
                address: company.address || '',
                linkedin: company.linkedin || '',
                source: company.source || '',
                lastUpdated: company.lastUpdated
                    ? new Date(company.lastUpdated).toISOString().split('T')[0]
                    : '',
            });

            // Phone as text
            const phoneCell = row.getCell('phone');
            phoneCell.numFmt = '@';

            // Alternating row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F7FB' },
                };
            }

            // Clickable website link
            if (company.website) {
                const cell = row.getCell('website');
                cell.value = { text: company.website, hyperlink: company.website };
                cell.font = { color: { argb: 'FF0563C1' }, underline: true };
            }

            // Clickable LinkedIn link
            if (company.linkedin) {
                const cell = row.getCell('linkedin');
                cell.value = { text: company.linkedin, hyperlink: company.linkedin };
                cell.font = { color: { argb: 'FF0A66C2' }, underline: true };
            }
        });

        // Auto-filter & freeze
        ws.autoFilter = { from: 'A1', to: `J${companies.length + 1}` };
        ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

        // ── Send response ────────────────────────────────────────────────────
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `enriched_companies_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

        console.log(`✅ Excel exported: ${filename} (${companies.length} companies)`);
    } catch (err) {
        console.error('Excel export error:', err);
        res.status(500).json({ error: 'Excel export failed', message: err.message });
    }
}

/**
 * GET /api/companies/enriched
 * Returns all enriched companies from MongoDB.
 */
export async function getEnrichedCompanies(req, res) {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.exhibition) filter.exhibition = new RegExp(req.query.exhibition, 'i');
        if (req.query.status) filter.enrichmentStatus = req.query.status;
        if (req.query.search) {
            filter.companyName = new RegExp(req.query.search, 'i');
        }

        const [companies, total] = await Promise.all([
            Company.find(filter).sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
            Company.countDocuments(filter),
        ]);

        res.json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: companies,
        });
    } catch (err) {
        console.error('Get enriched companies error:', err);
        res.status(500).json({ error: 'Failed to fetch companies', message: err.message });
    }
}
