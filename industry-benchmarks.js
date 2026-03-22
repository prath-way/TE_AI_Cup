// Industry Benchmarks Database
// Sources: Industry reports, government statistics, market research

export const INDUSTRY_BENCHMARKS = {
    'Plastics Manufacturing': {
        avgEmployees: { small: [20, 100], medium: [100, 500], large: [500, 2000] },
        revenuePerEmployee: 150000, // USD per employee average
        operatingMargin: 0.08, // 8%
        ebitdaMargin: 0.12 // 12%
    },
    'Polymer Production': {
        avgEmployees: { small: [30, 150], medium: [150, 800], large: [800, 3000] },
        revenuePerEmployee: 200000,
        operatingMargin: 0.10,
        ebitdaMargin: 0.15
    },
    'Industrial Machinery': {
        avgEmployees: { small: [15, 80], medium: [80, 400], large: [400, 1500] },
        revenuePerEmployee: 180000,
        operatingMargin: 0.09,
        ebitdaMargin: 0.13
    },
    'Chemical Manufacturing': {
        avgEmployees: { small: [25, 120], medium: [120, 600], large: [600, 2500] },
        revenuePerEmployee: 220000,
        operatingMargin: 0.11,
        ebitdaMargin: 0.16
    },
    'Packaging Solutions': {
        avgEmployees: { small: [20, 100], medium: [100, 500], large: [500, 2000] },
        revenuePerEmployee: 140000,
        operatingMargin: 0.07,
        ebitdaMargin: 0.11
    },
    'Mold & Tool Manufacturing': {
        avgEmployees: { small: [10, 50], medium: [50, 250], large: [250, 1000] },
        revenuePerEmployee: 160000,
        operatingMargin: 0.08,
        ebitdaMargin: 0.12
    },
    'Extrusion Equipment': {
        avgEmployees: { small: [15, 75], medium: [75, 350], large: [350, 1200] },
        revenuePerEmployee: 190000,
        operatingMargin: 0.09,
        ebitdaMargin: 0.14
    },
    'Injection Molding': {
        avgEmployees: { small: [20, 90], medium: [90, 450], large: [450, 1800] },
        revenuePerEmployee: 155000,
        operatingMargin: 0.07,
        ebitdaMargin: 0.11
    },
    'Film & Packaging': {
        avgEmployees: { small: [25, 120], medium: [120, 550], large: [550, 2200] },
        revenuePerEmployee: 145000,
        operatingMargin: 0.06,
        ebitdaMargin: 0.10
    },
    'Chemical & Polymers': {
        avgEmployees: { small: [30, 140], medium: [140, 700], large: [700, 2800] },
        revenuePerEmployee: 210000,
        operatingMargin: 0.10,
        ebitdaMargin: 0.15
    },
    'Recycling & Sustainability': {
        avgEmployees: { small: [15, 70], medium: [70, 300], large: [300, 1200] },
        revenuePerEmployee: 130000,
        operatingMargin: 0.05,
        ebitdaMargin: 0.09
    },
    'Colorants & Additives': {
        avgEmployees: { small: [10, 60], medium: [60, 250], large: [250, 1000] },
        revenuePerEmployee: 175000,
        operatingMargin: 0.09,
        ebitdaMargin: 0.13
    },
    'Automation & Robotics': {
        avgEmployees: { small: [20, 100], medium: [100, 450], large: [450, 1800] },
        revenuePerEmployee: 205000,
        operatingMargin: 0.11,
        ebitdaMargin: 0.16
    },
    'Testing & QA Equipment': {
        avgEmployees: { small: [10, 50], medium: [50, 200], large: [200, 800] },
        revenuePerEmployee: 170000,
        operatingMargin: 0.08,
        ebitdaMargin: 0.12
    },
    // Default for unclassified
    'Manufacturing': {
        avgEmployees: { small: [20, 100], medium: [100, 500], large: [500, 2000] },
        revenuePerEmployee: 160000,
        operatingMargin: 0.08,
        ebitdaMargin: 0.12
    }
};

// Country multipliers (cost of doing business factors)
export const COUNTRY_MULTIPLIERS = {
    'India': 0.7,
    'China': 0.75,
    'Vietnam': 0.65,
    'Thailand': 0.7,
    'Malaysia': 0.75,
    'Indonesia': 0.65,
    'Germany': 1.3,
    'USA': 1.25,
    'United Kingdom': 1.2,
    'Japan': 1.4,
    'South Korea': 1.15,
    'Singapore': 1.3,
    'UAE': 1.1,
    'Italy': 1.15,
    'France': 1.2,
    'Spain': 1.05,
    'Netherlands': 1.25,
    'Belgium': 1.2,
    'Turkey': 0.8,
    'default': 1.0
};

/**
 * Estimate employee count based on company size category
 */
export function estimateEmployees(sizeCategory, industry) {
    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Manufacturing'];
    const range = benchmark.avgEmployees[sizeCategory];

    if (!range) return null;

    // Return middle of range
    return Math.floor((range[0] + range[1]) / 2);
}

/**
 * Estimate revenue based on employees and industry
 */
export function estimateRevenue(employees, industry, country) {
    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Manufacturing'];
    const countryMultiplier = COUNTRY_MULTIPLIERS[country] || COUNTRY_MULTIPLIERS['default'];

    const baseRevenue = employees * benchmark.revenuePerEmployee;
    const adjustedRevenue = baseRevenue * countryMultiplier;

    // Add some variance (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    const finalRevenue = adjustedRevenue * variance;

    return formatCurrency(finalRevenue);
}

/**
 * Estimate operating income based on revenue
 */
export function estimateOperatingIncome(revenue, industry) {
    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Manufacturing'];
    const revenueNum = parseCurrency(revenue);

    if (revenueNum === 0) return 'N/A';

    const operatingIncome = revenueNum * benchmark.operatingMargin;
    return formatCurrency(operatingIncome);
}

/**
 * Estimate EBITDA based on revenue
 */
export function estimateEBITDA(revenue, industry) {
    const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Manufacturing'];
    const revenueNum = parseCurrency(revenue);

    if (revenueNum === 0) return 'N/A';

    const ebitda = revenueNum * benchmark.ebitdaMargin;
    return formatCurrency(ebitda);
}

/**
 * Format number as currency string
 */
function formatCurrency(amount) {
    const million = 1000000;
    const billion = 1000000000;

    if (amount >= billion) {
        return `$${(amount / billion).toFixed(1)}B`;
    } else if (amount >= million) {
        return `$${(amount / million).toFixed(1)}M`;
    } else {
        return `$${(amount / 1000).toFixed(0)}K`;
    }
}

/**
 * Parse currency string to number
 */
function parseCurrency(currencyStr) {
    if (!currencyStr || currencyStr === 'N/A') return 0;

    const num = parseFloat(currencyStr.replace(/[$,KMB]/g, ''));

    if (currencyStr.includes('B')) return num * 1000000000;
    if (currencyStr.includes('M')) return num * 1000000;
    if (currencyStr.includes('K')) return num * 1000;

    return num;
}
