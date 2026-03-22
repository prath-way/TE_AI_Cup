/**
 * websiteScraper.js
 * Visits a company website using Puppeteer (stealth) and returns the
 * full page text plus the contact-page text so contactExtractor can parse it.
 *
 * Falls back to plain axios + cheerio if Puppeteer fails or is too slow.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const SCRAPE_TIMEOUT = parseInt(process.env.SCRAPE_TIMEOUT_MS || '15000', 10);

// ── Shared browser pool ─────────────────────────────────────────────────────
let _browser = null;
let _browserUseCount = 0;
const MAX_BROWSER_USES = 50; // recycle after N uses to avoid memory leaks

async function getBrowser() {
    if (!_browser || !_browser.isConnected() || _browserUseCount >= MAX_BROWSER_USES) {
        if (_browser) await _browser.close().catch(() => { });
        _browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        _browserUseCount = 0;
    }
    _browserUseCount++;
    return _browser;
}

/** Graceful shutdown */
export async function closeBrowserPool() {
    if (_browser) {
        await _browser.close().catch(() => { });
        _browser = null;
    }
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
];

function randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizeUrl(raw) {
    if (!raw) return null;
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
        return new URL(url).href;
    } catch { return null; }
}

/**
 * Strip scripts/styles from cheerio DOM and return clean body text.
 */
function cleanText($) {
    $('script, style, noscript, svg, img').remove();
    return $('body').text().replace(/\s{2,}/g, ' ').trim();
}

/**
 * Lightweight visit with axios — fast; fails on JS-heavy sites.
 * @param {string} url
 * @returns {Promise<string>} page text
 */
async function fetchWithAxios(url) {
    const res = await axios.get(url, {
        headers: { 'User-Agent': randomUA(), 'Accept-Language': 'en-US,en;q=0.5' },
        timeout: 8000,
        maxRedirects: 5,
    });
    const $ = cheerio.load(res.data);
    return cleanText($);
}

/**
 * Full headless visit with Puppeteer (handles JS rendering).
 * @param {string} url
 * @returns {Promise<string>} page text
 */
async function fetchWithPuppeteer(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setUserAgent(randomUA());

        // Block images/fonts/CSS to speed things up
        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_TIMEOUT });
        await new Promise(r => setTimeout(r, 1000));

        const text = await page.evaluate(() => document.body.innerText);
        return text.replace(/\s{2,}/g, ' ').trim();
    } finally {
        await page.close().catch(() => { });
    }
}

/**
 * Try multiple candidate pages and return concatenated text.
 * Priority: homepage → /contact → /contact-us → /about
 *
 * @param {string} rawUrl  - company website URL (with or without protocol)
 * @returns {Promise<{ homepageText: string, contactText: string, allText: string }>}
 */
export async function scrapeWebsite(rawUrl) {
    const baseUrl = normalizeUrl(rawUrl);
    if (!baseUrl) return { homepageText: '', contactText: '', allText: '' };

    const base = (() => {
        try { const u = new URL(baseUrl); return `${u.protocol}//${u.host}`; }
        catch { return null; }
    })();
    if (!base) return { homepageText: '', contactText: '', allText: '' };

    const pages = {
        homepage: baseUrl,
        contact: `${base}/contact`,
        contactUs: `${base}/contact-us`,
        about: `${base}/about`,
    };

    const texts = {};

    for (const [key, url] of Object.entries(pages)) {
        // Try axios first (fast), Puppeteer as fallback
        let text = '';
        try {
            text = await fetchWithAxios(url);
        } catch {
            try {
                text = await fetchWithPuppeteer(url);
            } catch (err) {
                console.warn(`⚠️  Failed to scrape ${url}: ${err.message}`);
            }
        }
        if (text) texts[key] = text;
    }

    const homepageText = texts.homepage || '';
    const contactText = texts.contact || texts.contactUs || '';
    const allText = Object.values(texts).join('\n\n');

    return { homepageText, contactText, allText };
}
