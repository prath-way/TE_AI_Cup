/**
 * test-data-cleaner.js
 * Verify the dataCleaner works on real messy data from the Excel screenshot.
 */
import { extractContactInfo, cleanCompanyRecord, cleanCompanyRecords } from './utils/dataCleaner.js';

// ─── Test 1: The exact example from the user's requirements ──────────────────
console.log('═'.repeat(70));
console.log('TEST 1: User example — mixed text with email + phone + address');
console.log('═'.repeat(70));

const t1 = extractContactInfo(
    'America ABRO Balancing Inc. 619 Windsor Glen Drive, +1 (281) 404-5677 [sales@abrobalancing.com](mailto:sales@abrobalancing.com)'
);
console.log('  email:  ', t1.email);
console.log('  phones: ', t1.phones);
console.log('  address:', t1.address);
console.log();

// ─── Test 2: URL-encoded phone number  ───────────────────────────────────────
console.log('TEST 2: URL-encoded phone (+91%2075388%2009052)');
const t2 = extractContactInfo('+91%2075388%2009052');
console.log('  phones:', t2.phones);
console.log();

// ─── Test 3: Email embedded in address text ──────────────────────────────────
console.log('TEST 3: Email embedded in address');
const t3 = extractContactInfo('info@ams-india.co.in Address No 29 /1 Malik Building');
console.log('  email:  ', t3.email);
console.log('  address:', t3.address);
console.log();

// ─── Test 4: Phone number in address column ──────────────────────────────────
console.log('TEST 4: Phone in address column');
const t4 = extractContactInfo('Plot 131, KIADB Industrial Area, Bommasandra Jigani L+911244366257');
console.log('  phones: ', t4.phones);
console.log('  address:', t4.address);
console.log();

// ─── Test 5: Multiple phone numbers separated by / ───────────────────────────
console.log('TEST 5: Multiple phones (+91-9801329640 / +91-8...)');
const t5 = extractContactInfo('+91-9801329640 / +91-8123456789');
console.log('  phones:', t5.phones);
console.log();

// ─── Test 6: Full cleanCompanyRecord with cross-contaminated fields ──────────
console.log('═'.repeat(70));
console.log('TEST 6: Full record cleaning — cross-contaminated fields');
console.log('═'.repeat(70));

const dirty = {
    companyName: 'ABRO Balancing Inc.',
    gmailId: 'sales@abrobalancing.com',
    companyAddress: 'America ABRO Balancing Inc. 619 Windsor Glen Drive, +1 (281) 404-5677',
    contactNumber: '',
    source: 'IMTEX 2026',
};
const clean = cleanCompanyRecord(dirty);
console.log('  email:  ', clean.gmailId);
console.log('  phone:  ', clean.contactNumber);
console.log('  address:', clean.companyAddress);
console.log();

// ─── Test 7: Batch cleaning ─────────────────────────────────────────────────
console.log('TEST 7: Batch cleaning (3 companies)');

const batch = cleanCompanyRecords([
    {
        companyName: 'AMS India',
        gmailId: '',
        companyAddress: 'info@ams-india.co.in Address No 29 /1 Malik Building +91-733855403',
        contactNumber: '',
    },
    {
        companyName: 'Accurate Sales',
        gmailId: 'sales@accuratesales.co.in',
        companyAddress: '',
        contactNumber: '+91-20-66039000',
    },
    {
        companyName: 'AEON Engineering',
        gmailId: 'enquiries@aeon-eng.com',
        companyAddress: 'AEON Engineering Head Office Silverdale Road, Silverd03333 401 444',
        contactNumber: '',
    },
]);

for (const c of batch) {
    console.log(`  ${c.companyName}:`);
    console.log(`    email:   ${c.gmailId || '(empty)'}`);
    console.log(`    phone:   ${c.contactNumber || '(empty)'}`);
    console.log(`    address: ${c.companyAddress || '(empty)'}`);
}

console.log('\n✅ All tests complete.');
