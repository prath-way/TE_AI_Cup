/**
 * queues/enrichmentWorker.js
 * BullMQ Worker that processes company enrichment jobs.
 *
 * Each job contains a single company record. The worker:
 *   1. Searches Google/Bing for the company's website & LinkedIn.
 *   2. Scrapes the website for email, phone, address.
 *   3. Persists the result to MongoDB.
 *
 * Rate-limited by BullMQ's built-in limiter (1 job/second by default).
 */
import { Worker } from 'bullmq';
import { redisConnection } from './enrichmentQueue.js';
import { enrichCompany } from '../services/contactExtractor.js';
import Company from '../models/Company.js';

let worker = null;

export function startEnrichmentWorker() {
    if (!redisConnection) {
        console.warn('⚠️  Enrichment worker not started — Redis unavailable.');
        return null;
    }

    worker = new Worker(
        'company-enrichment',
        async (job) => {
            const { companyName, exhibition, boothNumber, website } = job.data;

            console.log(`⚙️  [Worker] Processing: ${companyName} (Job #${job.id})`);

            // Mark as in_progress in DB
            try {
                await Company.upsertEnriched({
                    companyName,
                    exhibition: exhibition || '',
                    boothNumber: boothNumber || '',
                    enrichmentStatus: 'in_progress',
                });
            } catch { /* DB may be down */ }

            // Run the enrichment pipeline
            const result = await enrichCompany({
                companyName,
                exhibition,
                boothNumber,
                website,
            });

            // Persist to MongoDB
            try {
                await Company.upsertEnriched({
                    companyName: result.companyName,
                    exhibition: result.exhibition || exhibition || '',
                    boothNumber: result.boothNumber || boothNumber || '',
                    website: result.website || '',
                    email: result.email || '',
                    phone: result.phone || '',
                    address: result.address || '',
                    linkedin: result.linkedin || '',
                    source: result.source || 'web_scraper',
                    enrichmentStatus: 'completed',
                });
            } catch (dbErr) {
                console.warn(`⚠️  DB save failed for ${companyName}: ${dbErr.message}`);
            }

            console.log(`✅ [Worker] Done: ${companyName} → website:${result.website || '-'} email:${result.email || '-'}`);
            return result;
        },
        {
            connection: redisConnection,
            concurrency: parseInt(process.env.BULK_CONCURRENCY || '5', 10),
            limiter: {
                max: 1,
                duration: parseInt(process.env.SEARCH_DELAY_MS || '2000', 10),
            },
        }
    );

    worker.on('completed', (job) => {
        // Job completed silently — logged inside the processor
    });

    worker.on('failed', async (job, err) => {
        console.error(`❌ [Worker] Failed: ${job?.data?.companyName} — ${err.message}`);
        // Mark as failed in DB
        try {
            if (job?.data?.companyName) {
                await Company.upsertEnriched({
                    companyName: job.data.companyName,
                    exhibition: job.data.exhibition || '',
                    enrichmentStatus: 'failed',
                    errorMessage: err.message,
                });
            }
        } catch { /* ignore */ }
    });

    worker.on('error', (err) => {
        console.error('❌ [Worker] Error:', err.message);
    });

    console.log('🔄 Enrichment worker started — processing jobs from Redis queue');
    return worker;
}

export function getWorker() {
    return worker;
}
