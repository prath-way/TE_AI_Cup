/**
 * utils/dataCleaner.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Data cleaning and normalization pipeline.
 *
 * Problem:  Scraped contact fields are messy — phone numbers appear in the
 *           address column, emails are embedded in address text, URL-encoded
 *           values like "+91%2075388%2009052", and duplicated values.
 *
 * Solution: extractContactInfo(text) pulls emails/phones OUT of any raw string,
 *           then cleanCompanyRecord() normalizes each company object so every
 *           column in the Excel export contains only the correct data type.
 *
 * Usage:
 *   import { cleanCompanyRecords } from './utils/dataCleaner.js';
 *   const clean = cleanCompanyRecords(rawCompanies);
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════════════════
//  REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

// Email — standard RFC-like pattern
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Phone — broad pattern that catches international formats:
//   +91 9876543210, (022) 1234-5678, +1-800-555-1234, +49 30 12345678
//   Also catches  +91%2075388%2009052  after URL-decode.
const PHONE_RE = /(?:\+?\d{1,3}[\s\-.(])?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,4}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,5})?/g;

// ISO-date false positive  (e.g. "2024-01-15")
const DATE_RE = /^\d{4}[.\-\/]\d{2}[.\-\/]\d{2}$/;

// Markdown mailto links:  [sales@foo.com](mailto:sales@foo.com)
const MAILTO_LINK_RE = /\[([^\]]+)\]\(mailto:[^)]+\)/g;

// Known junk email domains
const JUNK_DOMAINS = new Set([
    'example.com', 'example.org', 'test.com', 'test.org',
    'placeholder.com', 'sample.com', 'demo.com', 'dummy.com',
    'yourdomain.com', 'domain.com', 'email.com',
    'w3schools.com', 'w3.org', 'schema.org', 'sentry.io',
]);

// ═══════════════════════════════════════════════════════════════════════════════
//  VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

function isValidEmail(e) {
    if (!e || !e.includes('@')) return false;
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}$/.test(e)) return false;
    // Reject file-extension false-positives
    if (/\.(png|jpg|jpeg|gif|svg|css|js|webp|ico|woff|ttf|eot|otf|map)$/i.test(e)) return false;
    const [local, domain] = e.split('@');
    if (JUNK_DOMAINS.has(domain.toLowerCase())) return false;
    if (local.length < 2 || !domain.includes('.')) return false;
    return true;
}

function isValidPhone(p) {
    if (!p) return false;
    if (DATE_RE.test(p.trim())) return false;
    const digits = (p.match(/\d/g) || []).length;
    return digits >= 7 && digits <= 15;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CORE:  extractContactInfo(text)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a raw text blob and separate it into { email, phones[], address }.
 *
 * The function:
 *   1. URL-decodes the text (handles %20, %2B etc.)
 *   2. Unwraps markdown mailto links  [x](mailto:x)
 *   3. Extracts all valid email addresses
 *   4. Extracts all valid phone numbers
 *   5. Strips the extracted emails/phones from the text
 *   6. Returns the remaining text as the cleaned address
 *
 * @param {string} raw — raw scraped text (may contain emails, phones, address jumbled together)
 * @returns {{ email: string|null, phones: string[], address: string }}
 */
export function extractContactInfo(raw) {
    const result = { email: null, phones: [], address: '' };
    if (!raw || typeof raw !== 'string') return result;

    // ── Step 0: Decode URL-encoded characters ────────────────────────────────
    let text = raw;
    try { text = decodeURIComponent(raw); } catch { /* keep original */ }

    // ── Step 1: Unwrap markdown mailto links ─────────────────────────────────
    //    "[sales@foo.com](mailto:sales@foo.com)"  →  "sales@foo.com"
    text = text.replace(MAILTO_LINK_RE, '$1');

    // ── Step 2: Extract emails ───────────────────────────────────────────────
    const emailMatches = (text.match(EMAIL_RE) || []).filter(isValidEmail);
    // Deduplicate (case-insensitive)
    const seenEmails = new Set();
    const uniqueEmails = [];
    for (const em of emailMatches) {
        const key = em.toLowerCase();
        if (!seenEmails.has(key)) {
            seenEmails.add(key);
            uniqueEmails.push(em);
        }
    }
    result.email = uniqueEmails[0] || null;

    // Remove every extracted email from the text
    for (const em of uniqueEmails) {
        // Escape regex special chars in the email string
        const escaped = em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(escaped, 'gi'), '');
    }

    // ── Step 3: Extract phone numbers ────────────────────────────────────────
    const phoneMatches = (text.match(PHONE_RE) || [])
        .map(p => p.trim())
        .filter(isValidPhone);

    // Deduplicate by digits-only form
    const seenPhones = new Set();
    for (const ph of phoneMatches) {
        const digitsOnly = ph.replace(/\D/g, '');
        if (!seenPhones.has(digitsOnly)) {
            seenPhones.add(digitsOnly);
            result.phones.push(ph);
        }
    }

    // Remove every extracted phone from the text
    for (const ph of result.phones) {
        const escaped = ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(escaped, 'g'), '');
    }

    // ── Step 4: Clean the remaining text as the address ──────────────────────
    text = text
        .replace(/mailto:\S*/gi, '')          // strip leftover mailto: links
        .replace(/https?:\/\/\S*/gi, '')       // strip stray URLs
        .replace(/\[|\]|\(|\)/g, '')           // strip markdown brackets
        .replace(/,\s*,/g, ',')                // collapse double commas
        .replace(/\s{2,}/g, ' ')               // collapse whitespace
        .replace(/^[\s,\-/|]+/, '')            // trim leading junk chars
        .replace(/[\s,\-/|]+$/, '')            // trim trailing junk chars
        .trim();

    result.address = text || '';

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  cleanCompanyRecord(company)  — normalize one company object
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Takes a raw company record (as it comes from the scraper or in-memory dataset)
 * and normalizes all contact fields.
 *
 * Logic:
 *   1. Merge ALL text fields that may contain contact info:
 *        gmailId, contactNumber, companyAddress
 *   2. Run extractContactInfo on the merged blob AND on each field individually
 *   3. Assign the best email / phone / address to their correct columns
 *   4. Ensure no column contains data that belongs in another column
 *
 * @param {Object} company — raw company record
 * @returns {Object} — company with cleaned gmailId, contactNumber, companyAddress
 */
export function cleanCompanyRecord(company) {
    // ── Gather raw field values ──────────────────────────────────────────────
    const rawEmail = String(company.gmailId || '').trim();
    const rawAddress = String(company.companyAddress || '').trim();
    const rawPhone = String(company.contactNumber || '').trim();

    // ── Parse each field individually ────────────────────────────────────────
    const fromEmail = extractContactInfo(rawEmail);
    const fromAddress = extractContactInfo(rawAddress);
    const fromPhone = extractContactInfo(rawPhone);

    // ── Also parse a merged blob (catches cross-contamination) ───────────────
    const merged = [rawEmail, rawAddress, rawPhone].filter(Boolean).join(' | ');
    const fromMerged = extractContactInfo(merged);

    // ── Resolve best email ───────────────────────────────────────────────────
    //    Priority: explicit email field > address-embedded > phone-embedded > merged
    const finalEmail = fromEmail.email
        || fromAddress.email
        || fromPhone.email
        || fromMerged.email
        || '';

    // ── Resolve best phone ───────────────────────────────────────────────────
    //    Collect all unique phones from every source, pick the first
    const allPhones = new Map();
    const addPhones = (phones) => {
        for (const p of phones) {
            const key = p.replace(/\D/g, '');
            if (key && !allPhones.has(key)) allPhones.set(key, p);
        }
    };
    addPhones(fromPhone.phones);
    addPhones(fromAddress.phones);
    addPhones(fromEmail.phones);
    addPhones(fromMerged.phones);

    const phoneList = [...allPhones.values()];
    // Join multiple phones with " / " separator for the Excel cell
    const finalPhone = phoneList.length > 0
        ? phoneList.join(' / ')
        : '';

    // ── Resolve best address ─────────────────────────────────────────────────
    //    Use the address-field extraction (which already had emails/phones stripped)
    //    Fall back to merged extraction
    let finalAddress = fromAddress.address || fromMerged.address || '';

    // Extra safety: if the "address" still contains an email, strip it
    if (finalEmail && finalAddress.toLowerCase().includes(finalEmail.toLowerCase())) {
        finalAddress = finalAddress.replace(new RegExp(finalEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    // Strip stray phone numbers from address (belt-and-suspenders)
    for (const ph of phoneList) {
        const escaped = ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        finalAddress = finalAddress.replace(new RegExp(escaped, 'g'), '');
    }
    // Final whitespace cleanup
    finalAddress = finalAddress.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/^[\s,\-/|]+/, '').replace(/[\s,\-/|]+$/, '').trim();

    return {
        ...company,
        gmailId: finalEmail,
        contactNumber: finalPhone,
        companyAddress: finalAddress,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  cleanCompanyRecords(companies)  — batch cleaning for Excel export
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean an entire array of company records.
 * This is the single entry point you call before generating the Excel/CSV.
 *
 * @param {Array} companies — raw company array
 * @returns {Array} — cleaned company array (same length, same order)
 */
export function cleanCompanyRecords(companies) {
    if (!Array.isArray(companies)) return [];
    return companies.map(cleanCompanyRecord);
}
