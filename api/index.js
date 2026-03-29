import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import { enrichAllCompanies } from '../enrichment-service.js';
import { scrapeContactPage } from '../data-sources.js';
import { startBackgroundContactScraping } from '../data-sources.js';
import { cleanCompanyRecords } from '../utils/dataCleaner.js';


/**
 * Run scrapeContactPage concurrently with a pool limit.
 * For pre-scraped companies (cache hit) this returns instantly.
 * For un-cached companies it scrapes with concurrency limit.
 */
async function enrichContactsConcurrently(companies, concurrency = 20) {
    const results = [...companies];
    let idx = 0;

    async function worker() {
        while (idx < results.length) {
            const i = idx++;
            const company = results[i];

            if (company.companyLink) {
                try {
                    const contact = await scrapeContactPage(company.companyLink);
                    if (contact.email || contact.phone || contact.address) {
                        results[i] = {
                            ...company,
                            gmailId: contact.email || company.gmailId || '',
                            companyAddress: contact.address || company.companyAddress || '',
                            contactNumber: contact.phone || company.contactNumber || ''
                        };
                    }
                } catch { /* keep original */ }
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// app.use(express.static(__dirname));


// Log request size for debugging
app.use((req, res, next) => {
    if (req.method === 'POST') {
        const size = req.get('content-length');
        if (size) {
            console.log(`📥 Incoming ${req.method} request to ${req.url} - Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
        }
    }
    next();
});

// Load companies data
let companiesData = [];
let plastindiaCompanies = [];
let imtexCompanies = [];
let plasteurasiaCompanies = [];
let blechexpoCompanies = [];
let globalchemCompanies = [];
let himtexCompanies = [];
let chinaplasCompanies = [];

try {
    // Load Plastindia companies
    const plastindiaData = fs.readFileSync(path.join(__dirname, '..', 'companies_full.json'), 'utf-8');

    plastindiaCompanies = JSON.parse(plastindiaData);

    // Add source tag to Plastindia companies
    plastindiaCompanies = plastindiaCompanies.map(company => ({
        ...company,
        source: 'Plastindia 2026',
        hall: company.hall || '',
        booth: company.booth || ''
    }));

    console.log(`✅ Loaded ${plastindiaCompanies.length} companies from Plastindia`);
} catch (error) {
    console.error('⚠️  Error loading Plastindia data:', error.message);
}

try {
    // Load IMTEX companies
    const imtexData = fs.readFileSync(path.join(__dirname, '..', 'imtex_companies_simple.json'), 'utf-8');

    imtexCompanies = JSON.parse(imtexData);

    // Normalize IMTEX data to match Plastindia format
    imtexCompanies = imtexCompanies.map(company => ({
        companyName: company.companyName,
        hall: company.hallNo || '',
        booth: company.boothNo || '',
        companyLink: company.companyLink || '',
        profile: '',
        source: 'IMTEX 2026'
    }));

    console.log(`✅ Loaded ${imtexCompanies.length} companies from IMTEX`);
} catch (error) {
    console.error('⚠️  Error loading IMTEX data:', error.message);
}

try {
    // Load PlastEurasia companies
    const plasteurasiaData = fs.readFileSync(path.join(__dirname, '..', 'plasteurasia_data.json'), 'utf-8');

    plasteurasiaCompanies = JSON.parse(plasteurasiaData);

    // Normalize PlastEurasia data
    plasteurasiaCompanies = plasteurasiaCompanies.map(company => ({
        companyName: company.companyName,
        hall: company.hallNumber || '',
        booth: company.boothNumber || '',
        companyLink: company.companyLink || '',
        profile: '',
        source: 'PlastEurasia 2024'
    }));

    console.log(`✅ Loaded ${plasteurasiaCompanies.length} companies from PlastEurasia`);
} catch (error) {
    console.error('⚠️  Error loading PlastEurasia data:', error.message);
}

let kOnlineCompanies = [];
try {
    // Load K-Online companies
    const kOnlineData = fs.readFileSync(path.join(__dirname, '..', 'k_online_data.json'), 'utf-8');

    kOnlineCompanies = JSON.parse(kOnlineData);

    // Normalize K-Online data
    kOnlineCompanies = kOnlineCompanies.map(company => ({
        companyName: company.companyName,
        hall: company.hall || '',
        booth: company.booth || '',
        companyLink: company.companyLink || '',
        profile: '',
        source: 'K 2025' // Badge text
    }));

    console.log(`✅ Loaded ${kOnlineCompanies.length} companies from K 2025`);
} catch (error) {
    console.error('⚠️  Error loading K-Online data:', error.message);
}

let arabPlastCompanies = [];
try {
    const arabData = fs.readFileSync(path.join(__dirname, '..', 'arabplast_data.json'), 'utf-8');

    arabPlastCompanies = JSON.parse(arabData);

    // Normalize ArabPlast data
    arabPlastCompanies = arabPlastCompanies.map(company => ({
        companyName: company.companyName,
        hall: company.hall || '',
        booth: company.booth || '',
        companyLink: company.companyLink || '',
        profile: company.profile || '',
        source: 'ArabPlast 2025'
    }));

    console.log(`✅ Loaded ${arabPlastCompanies.length} companies from ArabPlast 2025`);
} catch (error) {
    console.error('⚠️  Error loading ArabPlast data:', error.message);
}

let iaaCompanies = [];
try {
    const iaaData = fs.readFileSync(path.join(__dirname, '..', 'iaa_data_final.json'), 'utf-8');

    iaaCompanies = JSON.parse(iaaData);

    // Normalize IAA data
    iaaCompanies = iaaCompanies.map(company => {
        // Parse hall "hall 12" -> "12"
        let hall = company.hall || '';
        if (hall.toLowerCase().startsWith('hall ')) {
            hall = hall.substring(5).trim();
        }

        // Parse booth "hall 12 | B60" -> "B60"
        let booth = company.stand || '';
        if (booth.includes('|')) {
            booth = booth.split('|')[1].trim();
        }

        return {
            companyName: company.name,
            hall: hall,
            booth: booth,
            companyLink: company.website || '',
            profile: company.description || '',
            source: 'IAA Transportation 2024'
        };
    });

    console.log(`✅ Loaded ${iaaCompanies.length} companies from IAA Transportation`);
} catch (error) {
    console.error('⚠️  Error loading IAA data:', error.message);
}

let emoCompanies = [];
try {
    const emoData = fs.readFileSync(path.join(__dirname, '..', 'emo_data.json'), 'utf-8');

    emoCompanies = JSON.parse(emoData);

    // Normalize EMO data
    emoCompanies = emoCompanies.map(company => ({
        companyName: company.name,
        hall: company.hall || '',
        booth: company.booth || '',
        companyLink: company.url || '',
        profile: '',
        source: 'EMO Hannover 2025'
    }));

    console.log(`✅ Loaded ${emoCompanies.length} companies from EMO Hannover`);
} catch (error) {
    console.error('⚠️  Error loading EMO Hannover data:', error.message);
}

try {
    const blechData = fs.readFileSync(path.join(__dirname, '..', 'blechexpo_data.json'), 'utf-8');

    blechexpoCompanies = JSON.parse(blechData);

    // Normalize Blechexpo data
    blechexpoCompanies = blechexpoCompanies.map(company => ({
        companyName: company.name,
        hall: company.hall || '',
        booth: company.booth || '',
        companyLink: company.url || '',
        profile: '',
        source: 'Blechexpo'
    }));

    console.log(`✅ Loaded ${blechexpoCompanies.length} companies from Blechexpo`);
} catch (error) {
    console.error('⚠️  Error loading Blechexpo data:', error.message);
}

try {
    const globalchemData = fs.readFileSync(path.join(__dirname, '..', 'globalchem_data.json'), 'utf-8');

    globalchemCompanies = JSON.parse(globalchemData);

    // Normalize Global Chem Expo data
    globalchemCompanies = globalchemCompanies.map(company => {
        // Stall format: "D 18, D 19" or "E 35"
        // Let's take the first one if multiple
        const stallParts = company.stallNo.split(',')[0].trim().split(' ');
        const hall = stallParts[0] || '';
        const booth = stallParts.slice(1).join(' ') || '';

        return {
            companyName: company.name,
            hall: hall,
            booth: booth,
            companyLink: company.url || '',
            profile: '',
            source: 'Global Chem Expo 2026'
        };
    });

    console.log(`✅ Loaded ${globalchemCompanies.length} companies from Global Chem Expo`);
} catch (error) {
    console.error('⚠️  Error loading Global Chem Expo data:', error.message);
}

// Load HIMTEX data
try {
    const himtexData = fs.readFileSync(path.join(__dirname, '..', 'himtex_data.json'), 'utf-8');

    himtexCompanies = JSON.parse(himtexData);

    himtexCompanies = himtexCompanies.map(company => {
        // Example: "2C35" -> Hall 2, Booth C35
        const stallNo = company.stallNo || '';
        const hall = stallNo.charAt(0);
        const booth = stallNo.substring(1);

        return {
            companyName: company.name,
            hall: hall,
            booth: booth,
            companyLink: company.url || '',
            profile: '',
            source: 'HIMTEX 2026'
        };
    });

    console.log(`✅ Loaded ${himtexCompanies.length} companies from HIMTEX`);
} catch (error) {
    console.error('⚠️  Error loading HIMTEX data:', error.message);
}

// Load Chinaplas data
try {
    const chinaplasPath = path.join(__dirname, '..', 'chinaplas_data.json');

    if (fs.existsSync(chinaplasPath)) {
        const chinaplasData = fs.readFileSync(chinaplasPath, 'utf-8');
        chinaplasCompanies = JSON.parse(chinaplasData);

        chinaplasCompanies = chinaplasCompanies.map(company => {
            return {
                companyName: company.name,
                hall: company.hall || '',
                booth: company.booth || '',
                companyLink: company.url || company.detailsLink || '',
                profile: '',
                source: 'Chinaplas 2026'
            };
        });

        console.log(`✅ Loaded ${chinaplasCompanies.length} companies from Chinaplas 2026`);
    }
} catch (error) {
    console.error('⚠️  Error loading Chinaplas data:', error.message);
}

// Combine all datasets
companiesData = [...plastindiaCompanies, ...imtexCompanies, ...plasteurasiaCompanies, ...kOnlineCompanies, ...arabPlastCompanies, ...iaaCompanies, ...emoCompanies, ...blechexpoCompanies, ...globalchemCompanies, ...himtexCompanies, ...chinaplasCompanies];

// Enrich all companies with real data only (no estimates)
console.log('🔄 Enriching company data (real data only, no estimates)...');
companiesData = enrichAllCompanies(companiesData);

console.log(`✅ Total companies loaded: ${companiesData.length}`);
console.log(`✅ Industry & Country detected from real data. Financial fields blank if not available.\n`);

// Start background contact scraping — fills cache so downloads are fast
// This runs in the background and does NOT block the server
startBackgroundContactScraping(companiesData, 8, (company, contact) => {
    // Find the company in our live data and update it
    const index = companiesData.findIndex(c =>
        c.companyName === company.companyName &&
        c.source === company.source
    );

    if (index !== -1) {
        companiesData[index] = {
            ...companiesData[index],
            gmailId: contact.email || companiesData[index].gmailId || '',
            contactNumber: contact.phone || companiesData[index].contactNumber || '',
            companyAddress: contact.address || companiesData[index].companyAddress || ''
        };
    }
});


// API Routes

// Get list of tradeshows
app.get('/api/tradeshows', (req, res) => {
    try {
        const tradeshows = [...new Set(companiesData.map(c => c.source))].filter(Boolean);
        res.json({ tradeshows });
    } catch (error) {
        console.error('Error fetching tradeshows:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all companies (for autocomplete)
app.get('/api/companies', (req, res) => {
    try {
        res.json({
            count: companiesData.length,
            companies: companiesData
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search endpoint
app.get('/api/search', (req, res) => {
    try {
        const query = req.query.query?.toLowerCase().trim();

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // Search in company name, company link, and source
        const results = companiesData.filter(company => {
            const nameMatch = company.companyName?.toLowerCase().includes(query);
            const linkMatch = company.companyLink?.toLowerCase().includes(query);
            const sourceMatch = company.source?.toLowerCase().includes(query);
            return nameMatch || linkMatch || sourceMatch;
        });

        console.log(`🔍 Search query: "${query}" - Found ${results.length} results`);

        res.json({
            query,
            count: results.length,
            results
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Contact scraping endpoint - extracts email, phone, address from company websites
app.post('/api/enrich-contacts', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        console.log(`\n📞 Contact enrichment requested for ${companies.length} companies`);

        const { scrapeContactPage } = await import('../data-sources.js');


        const enrichedCompanies = [];

        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];

            // Only scrape if at least one field is missing and a URL exists
            if (company.companyLink && (!company.gmailId || !company.contactNumber || !company.companyAddress)) {
                try {
                    const contactData = await scrapeContactPage(company.companyLink);
                    enrichedCompanies.push({
                        ...company,
                        gmailId: contactData.email || company.gmailId || '',
                        companyAddress: contactData.address || company.companyAddress || '',
                        contactNumber: contactData.phone || company.contactNumber || ''
                    });
                    console.log(`✅ ${i + 1}/${companies.length} - ${company.companyName}`);
                } catch (err) {
                    enrichedCompanies.push(company);
                }
            } else {
                enrichedCompanies.push(company);
            }

            // Rate limiting — be polite to servers
            if (i < companies.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        res.json({
            success: true,
            count: enrichedCompanies.length,
            companies: enrichedCompanies
        });
    } catch (error) {
        console.error('Contact enrichment error:', error);
        res.status(500).json({ error: 'Error enriching contact data' });
    }
});

// Real-time enrichment endpoint - enriches specific companies with real data
app.post('/api/enrich-real-data', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        console.log(`\n🌐 Real-time enrichment requested for ${companies.length} companies`);

        // Use the async enrichment with real data
        const { enrichAllCompaniesWithRealData } = await import('../enrichment-service.js');


        const enrichedCompanies = await enrichAllCompaniesWithRealData(
            companies,
            (current, total, company) => {
                console.log(`Progress: ${current}/${total} - ${company.companyName} (${company.dataSource})`);
            }
        );

        res.json({
            success: true,
            count: enrichedCompanies.length,
            companies: enrichedCompanies
        });
    } catch (error) {
        console.error('Real-time enrichment error:', error);
        res.status(500).json({ error: 'Error enriching company data' });
    }
});


// Download CSV endpoint
app.post('/api/download/csv', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `companies_${timestamp}.csv`;
        const filepath = path.join('/tmp', filename);


        // Create CSV writer
        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'companyName', title: 'Company Name' },
                { id: 'companyLink', title: 'Company Link' },
                { id: 'hall', title: 'Hall Number' },
                { id: 'booth', title: 'Booth Number' },
                { id: 'source', title: 'Trade Show' },
                { id: 'gmailId', title: 'Email Address' },
                { id: 'companyAddress', title: 'Company Address' },
                { id: 'contactNumber', title: 'Contact Number' },
                { id: 'businessDescription', title: 'Business Description' },
                { id: 'industry', title: 'Industry' },
                { id: 'hqCountry', title: 'HQ Country' },
                { id: 'employees', title: 'Number of Employees' },
                { id: 'revenue', title: 'Revenue' },
                { id: 'operatingIncome', title: 'Operating Income' },
                { id: 'ebitda', title: 'EBITDA' },
                { id: 'dataSource', title: 'Data Source' },
                { id: 'dataConfidence', title: 'Data Confidence (%)' }
            ]
        });

        // ── Scrape contact info (email, phone, address) in parallel ──────────
        console.log(`\n📞 Scraping contact info for ${companies.length} companies...`);
        const enrichedForCsv = await enrichContactsConcurrently(companies);
        console.log(`✅ Contact scraping complete.`);

        // ── Clean / normalize contact fields before export ───────────────────
        const cleanedForCsv = cleanCompanyRecords(enrichedForCsv);
        console.log(`🧹 Data cleaning complete for ${cleanedForCsv.length} companies.`);

        // Write CSV
        await csvWriter.writeRecords(cleanedForCsv);

        console.log(`📄 CSV created: ${filename} (${cleanedForCsv.length} companies)`);

        // Send file
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error sending CSV:', err);
            }
            // Delete file after sending
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp CSV:', unlinkErr);
            });
        });
    } catch (error) {
        console.error('CSV generation error:', error);
        res.status(500).json({ error: 'Error generating CSV file' });
    }
});

// Download Excel endpoint
app.post('/api/download/excel', async (req, res) => {
    try {
        const { companies } = req.body;

        if (!companies || !Array.isArray(companies) || companies.length === 0) {
            return res.status(400).json({ error: 'No companies data provided' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `companies_${timestamp}.xlsx`;
        const filepath = path.join('/tmp', filename);


        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Companies');

        // Define columns
        worksheet.columns = [
            { header: 'Company Name', key: 'companyName', width: 40 },
            { header: 'Company Link', key: 'companyLink', width: 50 },
            { header: 'Hall Number', key: 'hall', width: 15 },
            { header: 'Booth Number', key: 'booth', width: 15 },
            { header: 'Trade Show', key: 'source', width: 25 },
            { header: 'Email Address', key: 'gmailId', width: 35 },
            { header: 'Company Address', key: 'companyAddress', width: 45 },
            { header: 'Contact Number', key: 'contactNumber', width: 20 },
            { header: 'Business Description', key: 'businessDescription', width: 60 },
            { header: 'Industry', key: 'industry', width: 30 },
            { header: 'HQ Country', key: 'hqCountry', width: 20 },
            { header: 'Employees', key: 'employees', width: 15 },
            { header: 'Revenue', key: 'revenue', width: 15 },
            { header: 'Operating Income', key: 'operatingIncome', width: 18 },
            { header: 'EBITDA', key: 'ebitda', width: 15 },
            { header: 'Data Source', key: 'dataSource', width: 25 },
            { header: 'Data Confidence (%)', key: 'dataConfidence', width: 20 }
        ];

        // Style header row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // ── Scrape contact info (email, phone, address) in parallel ──────────
        console.log(`\n📞 Scraping contact info for ${companies.length} companies...`);
        const enrichedForExcel = await enrichContactsConcurrently(companies);
        console.log(`✅ Contact scraping complete.`);

        // ── Clean / normalize contact fields before export ───────────────────
        const cleanedForExcel = cleanCompanyRecords(enrichedForExcel);
        console.log(`🧹 Data cleaning complete for ${cleanedForExcel.length} companies.`);

        // Add data rows
        cleanedForExcel.forEach((company, index) => {
            // Ensure all text fields are strings — prevents scientific notation in Excel
            const rowData = {
                ...company,
                contactNumber: company.contactNumber ? String(company.contactNumber) : '',
                employees: company.employees ? String(company.employees) : '',
                revenue: company.revenue ? String(company.revenue) : '',
                operatingIncome: company.operatingIncome ? String(company.operatingIncome) : '',
                ebitda: company.ebitda ? String(company.ebitda) : '',
                dataConfidence: company.dataConfidence ? String(company.dataConfidence) : ''
            };

            const row = worksheet.addRow(rowData);

            // Force Contact Number cell to text so Excel doesn't convert to number
            const contactCell = row.getCell('contactNumber');
            contactCell.numFmt = '@';  // '@' = text format in Excel
            if (rowData.contactNumber) {
                contactCell.value = { richText: [{ text: rowData.contactNumber }] };
            }

            // Alternating row colors
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF2F2F2' }
                };
            }

            // Make links clickable
            if (company.companyLink) {
                const linkCell = row.getCell('companyLink');
                linkCell.value = {
                    text: company.companyLink,
                    hyperlink: company.companyLink
                };
                linkCell.font = { color: { argb: 'FF0563C1' }, underline: true };
            }
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: `Q${enrichedForExcel.length + 1}`  // Q column for Data Confidence
        };

        // Freeze header row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // Save file
        await workbook.xlsx.writeFile(filepath);

        console.log(`📊 Excel created: ${filename} (${companies.length} companies)`);

        // Send file
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error sending Excel:', err);
            }
            // Delete file after sending
            fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp Excel:', unlinkErr);
            });
        });
    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(500).json({ error: 'Error generating Excel file' });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


// Start server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('\n🚀 Server is running!');
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`📊 Total companies loaded: ${companiesData.length}`);
        console.log('\n✨ Ready to search and download company data!\n');
    });
}

export default app;

