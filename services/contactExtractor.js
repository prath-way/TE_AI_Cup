/**
 * contactExtractor.js
 * High-level orchestrator:
 *   1. Run Google/Bing search to find official website + LinkedIn.
 *   2. Scrape the website for email / phone / address.
 *   3. Return a structured contact record.
 *   4. Persist enriched data to MongoDB (if connected).
 *
 * Results are cached in-process to avoid re-scraping within the same session.
 */

import { findCompanyOnline } from './googleSearchService.js';
import { scrapeWebsite } from './websiteScraper.js';
import { extractEmail, extractPhone, extractAddress, extractLinkedIn } from '../utils/regexExtractor.js';

// Dynamic import for MongoDB model — may not be available if DB is down
let CompanyModel = null;
async function getModel() {
    if (CompanyModel) return CompanyModel;
    try {
        const mod = await import('../models/Company.js');
        CompanyModel = mod.default;
        return CompanyModel;
    } catch { return null; }
}

// ── In-process cache (survives for lifetime of process) ─────────────────────
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}

function setCached(key, data) {
    cache.set(key, { data, ts: Date.now() });
}

/**
 * Enrich a single company with contact data.
 *
 * @param {{ companyName: string, exhibition?: string, boothNumber?: string, website?: string }} company
 * @returns {Promise<{
 *   companyName: string,
 *   exhibition: string,
 *   boothNumber: string,
 *   website: string|null,
 *   email: string|null,
 *   phone: string|null,
 *   address: string|null,
 *   linkedin: string|null,
 *   source: string
 * }>}
 */
export async function enrichCompany(company) {
    const cacheKey = (company.companyName || '').toLowerCase().trim();

    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`📦 Cache hit: ${company.companyName}`);
        return cached;
    }

    const result = {
        companyName: company.companyName || '',
        exhibition: company.exhibition || company.source || '',
        boothNumber: company.boothNumber || company.booth || '',
        website: null,
        email: null,
        phone: null,
        address: null,
        linkedin: null,
        source: 'web_scraper',
    };

    try {
        // ── Step 1: Find website & LinkedIn via Google/Bing ─────────────────
        let website = company.website || company.companyLink || null;
        let linkedin = null;

        if (!website) {
            const searchResult = await findCompanyOnline(company.companyName);
            website = searchResult.website;
            linkedin = searchResult.linkedin;
            result.source = searchResult.source;
        }

        result.website = website;
        result.linkedin = linkedin;

        // ── Step 2: Scrape website pages ────────────────────────────────────
        if (website) {
            const { homepageText, contactText, allText } = await scrapeWebsite(website);

            // Email — prefer contact page, fallback to all text
            result.email = extractEmail(contactText) || extractEmail(allText);

            // Phone
            result.phone = extractPhone(contactText) || extractPhone(allText);

            // Address
            result.address = extractAddress(contactText) || extractAddress(allText);

            // LinkedIn — may appear as link on homepage
            if (!result.linkedin) {
                result.linkedin = extractLinkedIn(allText);
            }

            if (result.email || result.phone || result.address) {
                result.source = 'web_scraper';
            }
        }

        console.log(`✅ Enriched: ${company.companyName} → email:${result.email || '-'}, phone:${result.phone || '-'}`);
    } catch (err) {
        console.error(`❌ Enrichment failed for ${company.companyName}: ${err.message}`);
        result.source = 'error';
    }

    setCached(cacheKey, result);

    // ── Step 3: Persist to MongoDB (fire-and-forget) ────────────────────────
    try {
        const Model = await getModel();
        if (Model) {
            await Model.upsertEnriched({
                companyName: result.companyName,
                exhibition: result.exhibition,
                boothNumber: result.boothNumber,
                website: result.website || '',
                email: result.email || '',
                phone: result.phone || '',
                address: result.address || '',
                linkedin: result.linkedin || '',
                source: result.source,
                enrichmentStatus: result.source === 'error' ? 'failed' : 'completed',
            });
        }
    } catch { /* DB may be unavailable — that's fine, we have the in-memory cache */ }

    return result;
}

/**
 * Enrich a batch of companies with controlled concurrency.
 * Returns results as they complete, with progress logging.
 *
 * @param {Array} companies - array of company objects
 * @param {number} concurrency - max simultaneous enrichments
 * @param {Function} onProgress - callback(current, total, result)
 * @returns {Promise<Array>} - array of enriched results
 */
export async function enrichBatch(companies, concurrency = 3, onProgress = null) {
    const results = new Array(companies.length);
    let idx = 0;
    let completed = 0;

    async function worker() {
        while (idx < companies.length) {
            const i = idx++;
            try {
                results[i] = await enrichCompany(companies[i]);
            } catch (err) {
                results[i] = {
                    companyName: companies[i].companyName || '',
                    exhibition: companies[i].exhibition || '',
                    boothNumber: companies[i].boothNumber || '',
                    website: null, email: null, phone: null,
                    address: null, linkedin: null,
                    source: 'error',
                };
            }
            completed++;
            if (onProgress) onProgress(completed, companies.length, results[i]);
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, companies.length) }, worker));
    return results;
}
