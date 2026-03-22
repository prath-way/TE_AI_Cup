/**
 * regexExtractor.js
 * Regex-based utilities for extracting contact information from raw text/HTML.
 */

// ── Email ────────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g;

const FAKE_EMAIL_DOMAINS = new Set([
    'example.com', 'example.org', 'example.net', 'test.com', 'test.org',
    'placeholder.com', 'sample.com', 'demo.com', 'dummy.com',
    'yourdomain.com', 'domain.com', 'email.com', 'mail.com',
    'abc.com', 'xyz.com', 'foo.com', 'bar.com',
    'company.com', 'website.com', 'site.com',
    'tempmail.com', 'mailinator.com', 'guerrillamail.com',
    'w3schools.com', 'w3.org', 'iana.org', 'schema.org', 'sentry.io'
]);

const FAKE_EMAIL_PREFIXES = [
    'noreply', 'no-reply', 'donotreply', 'mailer-daemon',
    'postmaster', 'webmaster@example', 'admin@example', 'user@example', 'info@example'
];

/**
 * Validate an email string — returns false for known junk / placeholder addresses.
 */
export function isValidEmail(email) {
    if (!email || !email.includes('@')) return false;
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}$/.test(email)) return false;
    // Reject file-extension false-positives (e.g. styles@2x.png)
    if (/\.(png|jpg|jpeg|gif|svg|css|js|webp|ico|woff|ttf|eot|otf|map)$/i.test(email)) return false;
    const [local, domain] = email.split('@');
    if (FAKE_EMAIL_DOMAINS.has(domain.toLowerCase())) return false;
    if (FAKE_EMAIL_PREFIXES.some(p => email.toLowerCase().startsWith(p))) return false;
    if (domain.includes('jquery') || local.includes('@2x') || local.includes('2x.')) return false;
    if (local.length < 2 || !domain.includes('.')) return false;
    return true;
}

/**
 * Extract the best email address from a block of text.
 * @param {string} text
 * @returns {string|null}
 */
export function extractEmail(text) {
    if (!text) return null;
    const matches = (text.match(EMAIL_REGEX) || []).filter(isValidEmail);
    return matches.length > 0 ? matches[0] : null;
}

// ── Phone ────────────────────────────────────────────────────────────────────
// Matches: +91 9876543210, (022) 1234-5678, +1-800-555-1234, +49 30 12345678
const PHONE_REGEX = /(?:\+?[\d]{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,4}[\s\-.]?\d{3,5}/g;
const DATE_PHONE = /^\d{4}[.\-]\d{2}[.\-]\d{2}$/; // reject ISO dates

/**
 * Extract the best phone number from a block of text.
 * @param {string} text
 * @returns {string|null}
 */
export function extractPhone(text) {
    if (!text) return null;
    const matches = (text.match(PHONE_REGEX) || [])
        .map(p => p.trim())
        .filter(p => {
            if (DATE_PHONE.test(p)) return false; // skip dates
            const digits = (p.match(/\d/g) || []).length;
            return digits >= 7 && digits <= 15;    // reasonable phone length
        });
    return matches.length > 0 ? matches[0] : null;
}

// ── Address ──────────────────────────────────────────────────────────────────
// Address detection: look for common address-like patterns after keywords
const ADDRESS_KEYWORDS_RE = /(?:address|our office|located at|registered office|head office|headquarters|hq)[:\s]*([^\n<]{20,200})/gi;

// Address indicator words — if line contains several of these it's likely an address
const ADDRESS_INDICATORS = [
    'street', 'road', 'avenue', 'ave', 'blvd', 'boulevard', 'lane', 'drive', 'court',
    'industrial area', 'industrial estate', 'industrial zone', 'industrial park',
    'plot no', 'plot#', 'survey no', 'phase', 'sector', 'nagar', 'chowk', 'colony',
    'gali', 'marg', 'marg,', 'tech park', 'business park', 'commercial complex',
    'floor', 'building', 'tower', 'house no', 'flat no', 'unit no',
    'india', 'usa', 'germany', 'china', 'united states', 'united kingdom',
    'pvt', 'ltd', 'llc', 'gmbh', 'inc', 'corp', 'co\\.', 'limited',
    'pin', 'zip code', 'postal code',
    '\\d{6}',    // Indian PIN
    '\\d{5}',    // US ZIP
];

/**
 * Extract a likely address from a block of text.
 * Tries keyword patterns first, then falls back to line-scoring.
 * @param {string} text
 * @returns {string|null}
 */
export function extractAddress(text) {
    if (!text) return null;

    // 1. Look after address keywords
    const kwMatch = ADDRESS_KEYWORDS_RE.exec(text);
    ADDRESS_KEYWORDS_RE.lastIndex = 0; // reset for next call
    if (kwMatch && kwMatch[1] && kwMatch[1].trim().length > 15) {
        return kwMatch[1].trim().slice(0, 250);
    }

    // 2. Score each line by indicator hits
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 10 && l.length < 300);
    let bestLine = null;
    let bestScore = 0;

    for (const line of lines) {
        const lower = line.toLowerCase();
        let score = 0;
        for (const ind of ADDRESS_INDICATORS) {
            if (new RegExp(ind, 'i').test(lower)) score++;
        }
        // Boost if line contains a digit cluster (house number, PIN, ZIP)
        if (/\d{3,}/.test(line)) score++;
        if (score > bestScore) {
            bestScore = score;
            bestLine = line;
        }
    }

    return (bestScore >= 2 && bestLine) ? bestLine.slice(0, 250) : null;
}

// ── LinkedIn ─────────────────────────────────────────────────────────────────
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/company\/[a-zA-Z0-9_\-./]+/i;

/**
 * Extract the first LinkedIn company URL from text.
 * @param {string} text
 * @returns {string|null}
 */
export function extractLinkedIn(text) {
    if (!text) return null;
    const m = text.match(LINKEDIN_RE);
    return m ? m[0] : null;
}
