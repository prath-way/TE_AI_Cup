// Real Data Sources Module - Free Web Scraping + Public Databases
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Cache to avoid re-scraping same companies
const dataCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Main function to fetch real company data from multiple sources
 */
export async function fetchRealCompanyData(company) {
    const cacheKey = company.companyLink || company.companyName;

    // Check cache first
    const cached = dataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log(`📦 Cache hit: ${company.companyName}`);
        return cached.data;
    }

    const result = {
        employees: null,
        revenue: null,
        industry: null,
        hqCountry: null,
        gmailId: null,
        companyAddress: null,
        contactNumber: null,
        dataSource: 'estimated', // will update if real data found
        confidence: 0 // 0-100 scale
    };

    try {
        // Strategy 1: Try LinkedIn scraping for employee count
        const linkedinData = await scrapeLinkedIn(company.companyName);
        if (linkedinData.employees) {
            result.employees = linkedinData.employees;
            result.dataSource = 'LinkedIn';
            result.confidence = 80;
        }

        // Strategy 2: Try company website scraping
        if (company.companyLink) {
            const websiteData = await scrapeCompanyWebsite(company.companyLink);
            if (websiteData.employees && !result.employees) {
                result.employees = websiteData.employees;
                result.dataSource = 'Company Website';
                result.confidence = 60;
            }
            if (websiteData.industry) {
                result.industry = websiteData.industry;
            }

            // Strategy 2b: Scrape contact details (email, phone, address)
            const contactData = await scrapeContactPage(company.companyLink);
            if (contactData.email) result.gmailId = contactData.email;
            if (contactData.phone) result.contactNumber = contactData.phone;
            if (contactData.address) result.companyAddress = contactData.address;
            if (contactData.email || contactData.phone || contactData.address) {
                result.dataSource = 'Company Website';
                result.confidence = Math.max(result.confidence, 65);
            }
        }

        // Strategy 3: Try MCA database for Indian companies
        if (company.companyLink?.includes('.in') || company.source?.includes('India')) {
            const mcaData = await fetchMCAData(company.companyName);
            if (mcaData.revenue) {
                result.revenue = mcaData.revenue;
                result.dataSource = result.dataSource + ' + MCA';
                result.confidence = Math.max(result.confidence, 70);
            }
        }

        // Strategy 4: Try Companies House for UK companies
        if (company.companyLink?.includes('.uk') || company.companyLink?.includes('.co.uk')) {
            const ukData = await fetchCompaniesHouseData(company.companyName);
            if (ukData.revenue) {
                result.revenue = ukData.revenue;
                result.dataSource = result.dataSource + ' + Companies House';
                result.confidence = Math.max(result.confidence, 75);
            }
        }

        // Cache the result
        dataCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error(`❌ Error fetching real data for ${company.companyName}:`, error.message);
        return result;
    }
}

/**
 * Scrape LinkedIn for employee count
 * Note: LinkedIn heavily rate-limits and blocks scrapers, use sparingly
 */
async function scrapeLinkedIn(companyName) {
    try {
        // LinkedIn search URL
        const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;

        // Note: This will likely be blocked without proper authentication
        // Keeping basic structure for demonstration
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
        });

        const $ = cheerio.load(response.data);

        // Try to extract employee count from search results
        // LinkedIn structure: "X-Y employees" or "X employees"
        const employeeText = $('div:contains("employees")').first().text();
        const match = employeeText.match(/(\d+)[-–]?(\d+)?\s*employees/i);

        if (match) {
            const employeeCount = match[2] ? Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2) : parseInt(match[1]);
            console.log(`✅ LinkedIn: ${companyName} has ~${employeeCount} employees`);
            return { employees: employeeCount };
        }

        return {};

    } catch (error) {
        // LinkedIn blocking is expected, fail silently
        return {};
    }
}

/**
 * Scrape company's own website for employee/revenue information
 */
async function scrapeCompanyWebsite(companyUrl) {
    try {
        if (!companyUrl || !companyUrl.startsWith('http')) {
            return {};
        }

        const response = await axios.get(companyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const pageText = $('body').text().toLowerCase();

        const result = {};

        // Look for employee count patterns
        // Common patterns: "50 employees", "Team of 200", "200+ people", "Staff: 150"
        const employeePatterns = [
            /(\d+)\+?\s*employees/i,
            /team\s+of\s+(\d+)/i,
            /(\d+)\+?\s*people/i,
            /staff:\s*(\d+)/i,
            /workforce\s+of\s+(\d+)/i,
            /(\d+)\s*member\s+team/i
        ];

        for (const pattern of employeePatterns) {
            const match = pageText.match(pattern);
            if (match && parseInt(match[1]) > 5 && parseInt(match[1]) < 100000) {
                result.employees = parseInt(match[1]);
                console.log(`✅ Website: ${companyUrl} has ~${result.employees} employees`);
                break;
            }
        }

        // Look for revenue patterns
        // Patterns: "$10M revenue", "Revenue: $5 million", "turnover of £20M"
        const revenuePatterns = [
            /revenue[:\s]+[\$£€]?(\d+\.?\d*)\s*(million|m|billion|b)/i,
            /turnover[:\s]+[\$£€]?(\d+\.?\d*)\s*(million|m|billion|b)/i,
            /[\$£€](\d+\.?\d*)\s*(million|m|billion|b)\s+in\s+sales/i
        ];

        for (const pattern of revenuePatterns) {
            const match = pageText.match(pattern);
            if (match) {
                let amount = parseFloat(match[1]);
                const unit = match[2].toLowerCase();

                if (unit.startsWith('b')) {
                    amount *= 1000; // Convert to millions
                }

                result.revenue = `$${amount}M`;
                console.log(`✅ Website: ${companyUrl} revenue ~${result.revenue}`);
                break;
            }
        }

        // Try to detect industry from meta tags or page content
        const metaDescription = $('meta[name="description"]').attr('content');
        const metaKeywords = $('meta[name="keywords"]').attr('content');
        const industryText = `${metaDescription} ${metaKeywords}`.toLowerCase();

        if (industryText.includes('plastic') || industryText.includes('polymer')) {
            result.industry = 'Plastics Manufacturing';
        } else if (industryText.includes('machinery') || industryText.includes('equipment')) {
            result.industry = 'Industrial Machinery';
        }

        // Return raw text for AI summarization
        result.rawText = pageText.substring(0, 10000);

        return result;

    } catch (error) {
        // Many websites may block or timeout, fail silently
        return {};
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Global contact cache — survives for the lifetime of the server process.
// Key: normalized company URL (base domain).  Value: { email, phone, address }
// ─────────────────────────────────────────────────────────────────────────────
const contactCache = new Map();

/**
 * Normalise a raw URL string so we always get a proper https:// URL.
 */
function normaliseUrl(raw) {
    if (!raw) return null;
    let url = raw.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    try {
        const u = new URL(url);
        return u.href;      // canonical form
    } catch {
        return null;
    }
}

/**
 * Scrape a company website for email, phone and address.
 * Results are stored in contactCache keyed by the base domain so that
 * subsequent downloads are instant – no re-scraping needed.
 */
export async function scrapeContactPage(rawUrl) {
    const url = normaliseUrl(rawUrl);
    if (!url) return { email: null, phone: null, address: null };

    let base;
    try {
        const u = new URL(url);
        base = `${u.protocol}//${u.host}`;
    } catch {
        return { email: null, phone: null, address: null };
    }

    // ── Return cached result instantly ──────────────────────────────────────
    if (contactCache.has(base)) {
        return contactCache.get(base);
    }

    const result = { email: null, phone: null, address: null };

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    // Only try 2 pages to keep scraping fast
    const pagesToTry = [url, `${base}/contact`, `${base}/contact-us`];

    // ── Strict email regex ───────────────────────────────────────────────────
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/g;

    // ── Strict phone regex ───────────────────────────────────────────────────
    const phoneRegex = /(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-])?\d{3,4}[\s\-]?\d{3,5}/g;
    const JUNK_PHONE = /^\d{4}[.\-]\d{2}[.\-]\d{2}$/;

    // ── Email validator — rejects placeholder / system / fake addresses ──────
    const FAKE_DOMAINS = new Set([
        'example.com', 'example.org', 'example.net', 'example.co',
        'test.com', 'test.org', 'test.net',
        'placeholder.com', 'sample.com', 'demo.com', 'dummy.com',
        'yourdomain.com', 'youremail.com', 'yourcompany.com',
        'domain.com', 'email.com', 'mail.com',
        'abc.com', 'xyz.com', 'foo.com', 'bar.com',
        'company.com', 'website.com', 'site.com',
        'tempmail.com', 'mailinator.com', 'guerrillamail.com', 'trashmail.com',
        'fakeinbox.com', 'throwam.com', 'yopmail.com',
        'w3schools.com', 'w3.org', 'iana.org'
    ]);

    // Exhibition portal domains to exclude from result emails
    const PORTAL_DOMAINS = new Set([
        'plastindia.org', 'adsale.com.hk', 'chinaplasonline.com',
        'imtex.in', 'plasteurasia.com', 'adsale.com',
        'k-online.com', 'arabplast.info', 'iaa-transportation.com',
        'emo-hannover.de', 'blechexpo-messe.de', 'messe-stuttgart.de',
        'koelnmesse.de', 'messe-muenchen.de', 'messe-duesseldorf.de'
    ]);
    const FAKE_PREFIXES = ['noreply', 'no-reply', 'donotreply', 'do-not-reply',
        'mailer-daemon', 'postmaster', 'webmaster@example',
        'admin@example', 'user@example', 'info@example'];

    function isValidEmail(e) {
        if (!e || !e.includes('@')) return false;
        // Must look like a real email
        if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}$/.test(e)) return false;
        // Reject file-extension false-positives
        if (/\.(png|jpg|jpeg|gif|svg|css|js|webp|ico|woff|ttf|eot|otf|map)$/i.test(e)) return false;
        const [local, domain] = e.split('@');
        // Reject known fake domains
        if (FAKE_DOMAINS.has(domain.toLowerCase())) return false;
        // Reject known portal organization domains
        if (PORTAL_DOMAINS.has(domain.toLowerCase())) return false;
        // Reject known fake prefixes
        if (FAKE_PREFIXES.some(p => e.toLowerCase().startsWith(p))) return false;
        // Reject obvious tech artifact emails
        if (domain.includes('schema.org') || domain.includes('sentry.io') ||
            domain.includes('jquery') || domain.includes('w3.org') ||
            local.includes('@2x') || local.includes('2x.')) return false;
        // Local part must be at least 2 chars, domain must have at least one dot
        if (local.length < 2 || !domain.includes('.')) return false;
        return true;
    }

    for (let pageUrl of pagesToTry) {
        if (result.email && result.phone && result.address) break;

        try {
            const resp = await axios.get(pageUrl, {
                headers,
                timeout: 5000,
                maxRedirects: 3
            });

            const $ = cheerio.load(resp.data);

            // ── Portal Redirection Logic ─────────────────────────────────────
            // If we are on a known portal and haven't redirected yet, 
            // try to find the company's actual website.
            const currentHost = new URL(pageUrl).host;
            if (PORTAL_DOMAINS.has(currentHost) && pagesToTry.indexOf(pageUrl) === 0) {
                let externalUrl = null;

                // Common selectors for "Official Website" on exhibition portals
                $('a').each((_, el) => {
                    const href = $(el).attr('href');
                    const text = $(el).text().toLowerCase();
                    if (!href || href.startsWith('javascript') || href.startsWith('#')) return;

                    // Exclude links back to the portal itself
                    try {
                        const h = new URL(href, pageUrl);
                        if (PORTAL_DOMAINS.has(h.host)) return;

                        // Look for keywords like "website", "official", "company link"
                        if (text.includes('website') || text.includes('visit') ||
                            text.includes('homepage') || text.includes('official site')) {
                            externalUrl = h.href;
                            return false; // break each
                        }
                    } catch { /* ignore invalid hrefs */ }
                });

                if (externalUrl) {
                    console.log(`🔗 Portal Redirection: ${pageUrl} → ${externalUrl}`);
                    // Prepend external website to pagesToTry and follow it
                    const newBase = new URL(externalUrl).origin;
                    pagesToTry.unshift(externalUrl, `${newBase}/contact`);
                    continue; // Skip rest of current loop and try the new externalUrl
                }
            }

            $('script, style, noscript').remove();
            const pageText = $('body').text().replace(/\s+/g, ' ');

            // ── Email ────────────────────────────────────────────────────────
            if (!result.email) {
                // 1. mailto: links — most reliable, but still validate
                $('a[href^="mailto:"]').each((_, el) => {
                    if (result.email) return false; // break
                    const raw = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
                    if (isValidEmail(raw)) result.email = raw;
                });

                // 2. Regex fallback
                if (!result.email) {
                    const matches = (pageText.match(emailRegex) || []).filter(isValidEmail);
                    if (matches.length > 0) result.email = matches[0];
                }
            }

            // ── Phone ────────────────────────────────────────────────────────
            if (!result.phone) {
                // 1. tel: links are the most reliable
                const telEl = $('a[href^="tel:"]').first();
                if (telEl.length) {
                    result.phone = telEl.attr('href').replace('tel:', '').trim();
                }

                // 2. Regex fallback
                if (!result.phone) {
                    const matches = (pageText.match(phoneRegex) || [])
                        .map(p => p.trim())
                        .filter(p => {
                            if (JUNK_PHONE.test(p)) return false;  // reject dates
                            const digits = (p.match(/\d/g) || []).length;
                            return digits >= 7 && digits <= 15;
                        });
                    if (matches.length > 0) result.phone = matches[0];
                }
            }

            // ── Address ──────────────────────────────────────────────────────
            if (!result.address) {
                // 1. HTML <address> element
                const addrEl = $('address').first().text().replace(/\s+/g, ' ').trim();
                if (addrEl.length > 15) {
                    result.address = addrEl.substring(0, 200);
                }

                // 2. Schema.org streetAddress meta
                if (!result.address) {
                    const street = $('[itemprop="streetAddress"]').first().text().trim();
                    const city = $('[itemprop="addressLocality"]').first().text().trim();
                    if (street) result.address = [street, city].filter(Boolean).join(', ').substring(0, 200);
                }

                // 3. Keyword pattern in text
                if (!result.address) {
                    const m = pageText.match(/(?:address|our office|located at|registered office)[:\s]*([^<\n]{20,150})/i);
                    if (m && m[1]) result.address = m[1].trim().substring(0, 200);
                }
            }

        } catch {
            // Timeout or blocked — try next page
        }
    }

    // Store in cache so subsequent downloads are instant
    contactCache.set(base, result);

    if (result.email || result.phone || result.address) {
        console.log(`📞 ${base} → email:${result.email || '-'} phone:${result.phone || '-'}`);
    }

    return result;
}

/**
 * Start background contact scraping so the cache is warm by the time
 * the user downloads.
 *
 * @param {Array}  companies  - full companies array from server.js
 * @param {number} concurrency - simultaneous requests (8 is safe)
 * @param {function} onUpdate - callback(company, contactData) triggered when data is found
 */
export async function startBackgroundContactScraping(companies, concurrency = 8, onUpdate = null) {
    // Only scrape companies that have a website link
    const withLinks = companies.filter(c => c.companyLink);
    console.log(`\n🔄 Background contact scraping started — ${withLinks.length} companies to scan (${concurrency} concurrent)\n`);

    let idx = 0;
    let found = 0;

    async function worker() {
        while (idx < withLinks.length) {
            const i = idx++;
            const company = withLinks[i];
            try {
                const contact = await scrapeContactPage(company.companyLink);
                if (contact.email || contact.phone || contact.address) {
                    found++;
                    if (onUpdate && typeof onUpdate === 'function') {
                        onUpdate(company, contact);
                    }
                }
            } catch { /* ignore */ }

            // Progress every 50 companies
            if (i > 0 && i % 50 === 0) {
                console.log(`⏳ Contact scan: ${i}/${withLinks.length} done — ${found} companies with data`);
            }
        }
    }

    // Run concurrently, don't block server startup (fire-and-forget)
    Promise.all(Array.from({ length: concurrency }, worker))
        .then(() => console.log(`\n✅ Background contact scraping complete — ${found}/${withLinks.length} companies have contact data\n`))
        .catch(err => console.error('Background scraping error:', err));
}


/**
 * Fetch data from MCA (Ministry of Corporate Affairs) - India
 * Note: MCA requires registration and has rate limits
 */
async function fetchMCAData(companyName) {
    try {
        // MCA V3 API endpoint (public search is limited)
        // For full access, you need to register at https://www.mca.gov.in/

        // This is a simplified version - real implementation would require:
        // 1. MCA API credentials
        // 2. Proper authentication
        // 3. Company CIN/registration number

        // For now, we'll return empty but keep structure for future enhancement
        console.log(`ℹ️  MCA lookup for ${companyName} - requires API credentials`);

        return {};

        /* Future implementation:
        const mcaResponse = await axios.post('https://www.mca.gov.in/mcafoportal/companyLLPMasterData', {
            companyName: companyName
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.MCA_API_KEY}`
            }
        });
        
        return {
            revenue: mcaResponse.data.financials?.revenue,
            employees: mcaResponse.data.employees
        };
        */

    } catch (error) {
        return {};
    }
}

/**
 * Fetch data from Companies House (UK)
 * UK company data is publicly available via their API
 */
async function fetchCompaniesHouseData(companyName) {
    try {
        // Companies House API is free but requires an API key
        // Sign up at: https://developer.company-information.service.gov.uk/

        const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

        if (!apiKey) {
            console.log(`ℹ️  Companies House lookup skipped - no API key`);
            return {};
        }

        // Search for company
        const searchUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}`;

        const searchResponse = await axios.get(searchUrl, {
            auth: {
                username: apiKey,
                password: ''
            },
            timeout: 5000
        });

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
            const companyNumber = searchResponse.data.items[0].company_number;

            // Get company filing history for financial data
            const filingUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}/filing-history`;

            const filingResponse = await axios.get(filingUrl, {
                auth: {
                    username: apiKey,
                    password: ''
                }
            });

            // Extract latest accounts filing
            const accountsFiling = filingResponse.data.items?.find(item =>
                item.category === 'accounts'
            );

            if (accountsFiling) {
                console.log(`✅ Companies House: Found data for ${companyName}`);
                // Note: Actual financial figures require downloading PDF documents
                // This would need additional processing
            }
        }

        return {};

    } catch (error) {
        return {};
    }
}

/**
 * Clear old cache entries
 */
export function clearOldCache() {
    const now = Date.now();
    for (const [key, value] of dataCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            dataCache.delete(key);
        }
    }
}
