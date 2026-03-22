/**
 * googleSearchService.js
 * Performs a Google search for a company and extracts:
 *  - official website URL
 *  - LinkedIn company page URL
 *
 * Strategy:
 *   1. Try lightweight axios + cheerio approach (fast, no JS render needed).
 *   2. If Google blocks with a CAPTCHA / 429, fall back to Puppeteer stealth.
 *
 * Rate-limit awareness: enforces a minimum 2 s gap between queries.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// ── Constants ─────────────────────────────────────────────────────────────────
const GOOGLE_SEARCH = 'https://www.google.com/search?q=';
const BING_SEARCH = 'https://www.bing.com/search?q=';

// Domains we should NEVER return as the "official website" (search engines, portals)
const EXCLUDE_DOMAINS = new Set([
    'google.com', 'google.co', 'bing.com', 'yahoo.com', 'duckduckgo.com',
    'wikipedia.org', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
    'amazon.com', 'indiamart.com', 'alibaba.com', 'made-in-china.com',
    'tradeindia.com', 'justdial.com', 'yellowpages.com', 'yelp.com',
    'bloomberg.com', 'zaubacorp.com', 'tofler.in', 'zauba.com',
    'linkedin.com', // handled separately
    'plastindia.org', 'imtex.in', 'chinaplasonline.com', 'chinaplas.com',
    'k-online.com', 'arabplast.info', 'iaa-transportation.com',
    'emo-hannover.de', 'blechexpo-messe.de', 'koelnmesse.de',
    'dnb.com', 'crunchbase.com', 'glassdoor.com', 'indeed.com',
]);

// Rotating user-agent pool to reduce blocking
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
];

const DEFAULT_DELAY = parseInt(process.env.SEARCH_DELAY_MS || '2000', 10);

let _lastRequestTime = 0;
async function throttle(ms = DEFAULT_DELAY) {
    const wait = ms - (Date.now() - _lastRequestTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastRequestTime = Date.now();
}

/**
 * Retry wrapper with exponential backoff.
 * @param {Function} fn  - async function to retry
 * @param {number}   max - max attempts
 * @returns {Promise<*>}
 */
async function withRetry(fn, max = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= max; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt < max) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                console.warn(`⏳ Retry ${attempt}/${max} in ${delay}ms: ${err.message}`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}

function randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function isExcluded(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return [...EXCLUDE_DOMAINS].some(d => host === d || host.endsWith('.' + d));
    } catch { return true; }
}

/**
 * Build the Google search query for a company.
 */
function buildQuery(companyName) {
    return `"${companyName}" official website email phone contact`;
}

/**
 * Parse search result HTML (Google or Bing) with cheerio.
 * Returns { website, linkedin }
 */
function parseSearchResults(html, searchEngine = 'google') {
    const $ = cheerio.load(html);
    const found = { website: null, linkedin: null };

    // Collect all hrefs from anchor tags
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        // Google wraps result links in /url?q=... — unwrap
        let url = href;
        if (searchEngine === 'google') {
            const m = href.match(/\/url\?(?:.*&)?q=([^&]+)/);
            if (m) url = decodeURIComponent(m[1]);
        }

        if (!url.startsWith('http')) return;

        try {
            const host = new URL(url).hostname.replace(/^www\./, '');

            // LinkedIn
            if (!found.linkedin && host === 'linkedin.com' && url.includes('/company/')) {
                found.linkedin = url.split('?')[0]; // strip tracking params
            }

            // Official website — first non-excluded result
            if (!found.website && !isExcluded(url)) {
                found.website = url.split('?')[0];
            }
        } catch { /* skip malformed URLs */ }
    });

    return found;
}

/**
 * Attempt search via axios (lightweight, no JS).
 */
async function searchWithAxios(companyName, engine = 'google') {
    await throttle(1500);
    const query = encodeURIComponent(buildQuery(companyName));
    const searchUrl = engine === 'google'
        ? `${GOOGLE_SEARCH}${query}&num=10`
        : `${BING_SEARCH}${query}&count=10`;

    const response = await axios.get(searchUrl, {
        headers: {
            'User-Agent': randomUA(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
        maxRedirects: 5,
    });

    // Detect Google CAPTCHA / block page
    if (response.data.includes('captcha') || response.data.includes('unusual traffic')) {
        throw new Error('CAPTCHA_DETECTED');
    }

    return parseSearchResults(response.data, engine);
}

/**
 * Fallback: search via Puppeteer stealth (handles JS rendering + CAPTCHA evasion).
 */
async function searchWithPuppeteer(companyName) {
    await throttle(3000);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        });

        const page = await browser.newPage();
        await page.setUserAgent(randomUA());
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

        const query = encodeURIComponent(buildQuery(companyName));
        await page.goto(`${BING_SEARCH}${query}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);

        const html = await page.content();
        return parseSearchResults(html, 'bing');
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
}

/**
 * Main export: find the official website and LinkedIn URL for a company name.
 *
 * @param {string} companyName
 * @returns {Promise<{ website: string|null, linkedin: string|null, source: string }>}
 */
export async function findCompanyOnline(companyName) {
    // 1. Try Google with retry
    try {
        const result = await withRetry(() => searchWithAxios(companyName, 'google'), 2);
        if (result.website) {
            console.log(`🔍 Google → ${companyName}: ${result.website}`);
            return { ...result, source: 'google_search' };
        }
    } catch (err) {
        console.warn(`⚠️  Google blocked for "${companyName}": ${err.message}`);
    }

    // 2. Fallback: Bing with retry
    try {
        const result = await withRetry(() => searchWithAxios(companyName, 'bing'), 2);
        if (result.website) {
            console.log(`🔍 Bing → ${companyName}: ${result.website}`);
            return { ...result, source: 'bing_search' };
        }
    } catch (err) {
        console.warn(`⚠️  Bing failed for "${companyName}": ${err.message}`);
    }

    // 3. Last resort: Puppeteer with stealth
    try {
        const result = await searchWithPuppeteer(companyName);
        if (result.website) {
            console.log(`🤖 Puppeteer → ${companyName}: ${result.website}`);
            return { ...result, source: 'puppeteer_search' };
        }
    } catch (err) {
        console.warn(`⚠️  Puppeteer failed for "${companyName}": ${err.message}`);
    }

    return { website: null, linkedin: null, source: 'not_found' };
}
