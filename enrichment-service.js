// Enrichment Service - Real Data Only (No Estimates)
import crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchRealCompanyData } from './data-sources.js';
import { generateBusinessSummary } from './services/geminiService.js';

// REAL DATA: Country detection from domain TLDs
const DOMAIN_COUNTRY_MAP = {
    // Asia
    '.in': 'India',
    '.co.in': 'India',
    '.cn': 'China',
    '.com.cn': 'China',
    '.jp': 'Japan',
    '.co.jp': 'Japan',
    '.kr': 'South Korea',
    '.co.kr': 'South Korea',
    '.sg': 'Singapore',
    '.com.sg': 'Singapore',
    '.my': 'Malaysia',
    '.com.my': 'Malaysia',
    '.th': 'Thailand',
    '.co.th': 'Thailand',
    '.vn': 'Vietnam',
    '.com.vn': 'Vietnam',
    '.id': 'Indonesia',
    '.co.id': 'Indonesia',
    '.pk': 'Pakistan',
    '.com.pk': 'Pakistan',
    '.bd': 'Bangladesh',
    '.lk': 'Sri Lanka',
    '.tw': 'Taiwan',
    '.com.tw': 'Taiwan',
    '.hk': 'Hong Kong',
    '.com.hk': 'Hong Kong',
    // Middle East
    '.ae': 'UAE',
    '.com.ae': 'UAE',
    '.sa': 'Saudi Arabia',
    '.com.sa': 'Saudi Arabia',
    '.ir': 'Iran',
    '.tr': 'Turkey',
    '.com.tr': 'Turkey',
    '.il': 'Israel',
    // Europe
    '.de': 'Germany',
    '.co.de': 'Germany',
    '.uk': 'United Kingdom',
    '.co.uk': 'United Kingdom',
    '.fr': 'France',
    '.it': 'Italy',
    '.es': 'Spain',
    '.nl': 'Netherlands',
    '.be': 'Belgium',
    '.pl': 'Poland',
    '.cz': 'Czech Republic',
    '.at': 'Austria',
    '.ch': 'Switzerland',
    '.se': 'Sweden',
    '.dk': 'Denmark',
    '.fi': 'Finland',
    '.no': 'Norway',
    '.pt': 'Portugal',
    '.hu': 'Hungary',
    '.ro': 'Romania',
    '.sk': 'Slovakia',
    '.bg': 'Bulgaria',
    '.hr': 'Croatia',
    '.si': 'Slovenia',
    // Americas
    '.us': 'USA',
    '.com.us': 'USA',
    '.ca': 'Canada',
    '.mx': 'Mexico',
    '.com.mx': 'Mexico',
    '.br': 'Brazil',
    '.com.br': 'Brazil',
    '.ar': 'Argentina',
    '.com.ar': 'Argentina',
    '.cl': 'Chile',
    '.co': 'Colombia',
    // Africa / Oceania
    '.au': 'Australia',
    '.com.au': 'Australia',
    '.nz': 'New Zealand',
    '.za': 'South Africa',
    '.co.za': 'South Africa',
    '.eg': 'Egypt',
    '.ng': 'Nigeria'
};

// REAL DATA: Industry keywords for detection from company name/profile
const INDUSTRY_KEYWORDS = {
    'Mold & Tool Manufacturing': ['mould', 'mold', 'tooling', 'die casting', 'press tool', 'stamping die'],
    'Extrusion Equipment': ['extrusion', 'extruder', 'extrude', 'extruding'],
    'Injection Molding': ['injection molding', 'injection moulding', 'injection machine', 'imm'],
    'Blow Molding': ['blow mold', 'blow mould', 'blowing machine', 'pet blowing', 'stretch blow'],
    'Film & Packaging': ['film', 'packaging', 'pack', 'flexo', 'lamination', 'multilayer', 'barrier film'],
    'Chemical & Polymers': ['chemical', 'polymer', 'resin', 'compound', 'nylon', 'polypropylene', 'polyethylene', 'polycarbonate'],
    'Recycling & Sustainability': ['recycle', 'recycling', 'eco', 'sustainable', 'green', 'waste management', 'circular'],
    'Colorants & Additives': ['color', 'colour', 'pigment', 'masterbatch', 'additive', 'stabilizer', 'filler', 'dye'],
    'Automation & Robotics': ['automation', 'robot', 'automatic', 'servo', 'cnc', 'plc', 'motion control'],
    'Testing & QA Equipment': ['testing', 'quality', 'inspection', 'measurement', 'calibration', 'metrology', 'coordinate measuring'],
    'Plastics Manufacturing': ['plastic', 'plastics', 'pvc', 'pet', 'hdpe', 'ldpe', 'pp', 'pe', 'abs', 'thermoplastic', 'elastomer'],
    'Rubber & Elastomers': ['rubber', 'elastomer', 'silicone', 'epdm', 'nbr', 'gasket', 'seal', 'o-ring'],
    'Industrial Machinery': ['machinery', 'machine tool', 'equipment', 'industrial machine', 'press', 'lathe', 'milling'],
    'Packaging Solutions': ['carton', 'bottle', 'container', 'label', 'pouch', 'sachet', 'blister'],
    'Polymer Production': ['polymerization', 'synthesis', 'monomer', 'petrochemical', 'specialty chemical'],
    'Die & Stamping': ['stamping', 'pressing', 'punching', 'blanking', 'forming'],
    'Surface Treatment': ['coating', 'plating', 'surface treatment', 'anodizing', 'painting', 'powder coat'],
    'Hot Runner & Auxiliary': ['hot runner', 'temperature controller', 'chiller', 'dryer', 'granulator', 'crusher'],
    'Metal Cutting & Machining': ['cutting tool', 'grinding', 'turning', 'boring', 'machining center', 'gear cutting'],
    'Automotive Components': ['automotive', 'auto parts', 'vehicle', 'car', 'truck', 'engine', 'transmission', 'suspension'],
    'Electronics & PCB': ['pcb', 'electronics', 'semiconductor', 'circuit board', 'connector', 'wire harness'],
    'Welding & Joining': ['welding', 'laser welding', 'ultrasonic welding', 'brazing', 'soldering'],
    'Fluid & Pneumatic': ['hydraulic', 'pneumatic', 'valve', 'pump', 'cylinder', 'actuator', 'compressor'],
    'Safety & Environment': ['safety', 'environment', 'emission', 'filtration', 'purification', 'water treatment']
};

/**
 * REAL DATA: Detect country from company website domain TLD
 * Returns null if no recognizable TLD is found
 */
function detectCountryFromDomain(companyLink) {
    if (!companyLink) return '';

    try {
        let domain = companyLink.toLowerCase().trim();
        // Normalize: strip protocol and path, keep just host
        domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

        // Check multi-part TLDs first (e.g. .co.in, .com.au) — order matters: longer first
        const sortedTlds = Object.keys(DOMAIN_COUNTRY_MAP).sort((a, b) => b.length - a.length);
        for (const tld of sortedTlds) {
            if (domain.endsWith(tld)) {
                return DOMAIN_COUNTRY_MAP[tld];
            }
        }

        // Keyword fallback in the full domain string
        if (domain.includes('india') || domain.includes('bharat') || domain.includes('hindustan')) return 'India';
        if (domain.includes('china') || domain.includes('chinese') || domain.includes('sino')) return 'China';
        if (domain.includes('germany') || domain.includes('deutsch')) return 'Germany';
        if (domain.includes('usa') || domain.includes('america')) return 'USA';
        if (domain.includes('japan') || domain.includes('nippon')) return 'Japan';
        if (domain.includes('korea') || domain.includes('korean')) return 'South Korea';
        if (domain.includes('italy') || domain.includes('italia')) return 'Italy';
        if (domain.includes('turkey') || domain.includes('turkiye')) return 'Turkey';
        if (domain.includes('france') || domain.includes('francais')) return 'France';
        if (domain.includes('brazil') || domain.includes('brasil')) return 'Brazil';

        return ''; // No country detected — leave blank
    } catch (error) {
        return '';
    }
}

/**
 * REAL DATA: Detect industry from company name and profile text
 * Returns '' if no keywords match
 */
function detectIndustry(company) {
    const text = `${company.companyName} ${company.profile || ''}`.toLowerCase();

    let bestMatch = '';
    let bestScore = 0;

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = industry;
        }
    }

    return bestMatch; // '' if no keywords matched
}

/**
 * REAL DATA: Enrich company data using only real sources
 * If data is not found from the trade show or company website, fields are left blank
 */
export async function enrichCompanyData(company) {
    try {
        // STEP 1: Try to fetch REAL data from external sources
        console.log(`🔍 Fetching real data for: ${company.companyName}`);
        const realData = await fetchRealCompanyData(company);

        // STEP 2: Detect industry (only if keywords match)
        const industry = realData.industry || detectIndustry(company);

        // STEP 3: Detect country (only from domain TLD)
        const hqCountry = realData.hqCountry || detectCountryFromDomain(company.companyLink);

        // STEP 4: Employees — only use real data, otherwise blank
        const employees = realData.employees || '';

        // STEP 5: Revenue — only use real data, otherwise blank
        const revenue = realData.revenue || '';

        // STEP 6: Profitability — blank (no estimates)
        const operatingIncome = '';
        const ebitda = '';

        // STEP 7: Business description — only use existing profile
        let businessDescription = company.profile || '';

        // STEP 8: Try to generate AI summary if we have some text
        let aiSummary = '';
        if (process.env.GEMINI_API_KEY) {
            // Use the combined text for AI analysis
            const aiText = `${company.companyName} ${businessDescription} ${realData.rawText || ''}`;
            aiSummary = await generateBusinessSummary(company.companyName, aiText);
        }

        return {
            ...company,
            businessDescription,
            industry,
            hqCountry,
            employees,
            revenue,
            operatingIncome,
            ebitda,
            aiSummary: aiSummary || '',
            gmailId: realData.gmailId || company.gmailId || '',
            companyAddress: realData.companyAddress || company.companyAddress || '',
            contactNumber: realData.contactNumber || company.contactNumber || '',
            dataSource: realData.dataSource !== 'estimated' ? realData.dataSource : 'trade show',
            dataConfidence: realData.confidence || ''
        };
    } catch (error) {
        console.error(`❌ Error enriching ${company.companyName}:`, error.message);

        // Return with blank enrichment fields on error
        return {
            ...company,
            businessDescription: company.profile || '',
            industry: detectIndustry(company),
            hqCountry: detectCountryFromDomain(company.companyLink),
            employees: '',
            revenue: '',
            operatingIncome: '',
            ebitda: '',
            gmailId: company.gmailId || '',
            companyAddress: company.companyAddress || '',
            contactNumber: company.contactNumber || '',
            dataSource: 'trade show',
            dataConfidence: ''
        };
    }
}

/**
 * Enrich all companies — Real data only, no estimates
 * Uses synchronous detection (industry from keywords, country from domain TLD)
 * All financial fields left blank
 */
export function enrichAllCompanies(companies) {
    console.log(`\n🔄 Enrichment Mode: Real Data Only`);
    console.log(`🔍 Detecting: Industry (from keywords), HQ Country (from domain TLD)`);
    console.log(`📋 Financial fields left blank — no estimates\n`);

    return companies.map(company => {
        const industry = detectIndustry(company);
        const hqCountry = detectCountryFromDomain(company.companyLink);
        const businessDescription = company.profile || '';

        return {
            ...company,
            businessDescription,
            industry,
            hqCountry,
            employees: '',
            revenue: '',
            operatingIncome: '',
            ebitda: '',
            gmailId: company.gmailId || '',
            companyAddress: company.companyAddress || '',
            contactNumber: company.contactNumber || '',
            dataSource: 'trade show',
            dataConfidence: ''
        };
    });
}

/**
 * Enrich companies with real data (async version for background processing)
 */
export async function enrichAllCompaniesWithRealData(companies, progressCallback) {
    console.log(`\n🌐 Real Data Enrichment Mode`);
    console.log(`🔍 Fetching from: Company Websites, Public Databases`);
    console.log(`⏱️  This may take several minutes for large datasets\n`);

    const enrichedCompanies = [];

    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];

        try {
            const enriched = await enrichCompanyData(company);
            enrichedCompanies.push(enriched);

            if (progressCallback) {
                progressCallback(i + 1, companies.length, enriched);
            }

            // Rate limiting
            if (i < companies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error(`❌ Failed to enrich ${company.companyName}:`, error.message);
            // Return with blank fields instead of estimates
            enrichedCompanies.push({
                ...company,
                businessDescription: company.profile || '',
                industry: detectIndustry(company),
                hqCountry: detectCountryFromDomain(company.companyLink),
                employees: '',
                revenue: '',
                operatingIncome: '',
                ebitda: '',
                gmailId: company.gmailId || '',
                companyAddress: company.companyAddress || '',
                contactNumber: company.contactNumber || '',
                dataSource: 'trade show',
                dataConfidence: ''
            });
        }
    }

    return enrichedCompanies;
}
