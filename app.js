// API Base URL
const API_URL = '/api';

// State
let currentResults = [];
let autocompleteTimeout = null;
let allCompanies = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const resultCount = document.getElementById('resultCount');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const downloadCsvBtn = document.getElementById('downloadCsv');
const downloadExcelBtn = document.getElementById('downloadExcel');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
const tradeshowContainer = document.getElementById('tradeshowContainer');
const themeToggle = document.getElementById('themeToggle');

let availableTradeshows = [];

// Event Listeners
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
        hideAutocomplete();
    }
});

// Autocomplete on input
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Clear previous timeout
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }

    if (query.length < 2) {
        hideAutocomplete();
        return;
    }

    // Debounce autocomplete
    autocompleteTimeout = setTimeout(() => {
        showAutocomplete(query);
    }, 300);
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-wrapper')) {
        hideAutocomplete();
    }
});

downloadCsvBtn.addEventListener('click', () => downloadFile('csv'));
downloadExcelBtn.addEventListener('click', () => downloadFile('excel'));

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
    }
}
initTheme();

// Load all companies for autocomplete
async function loadAllCompanies() {
    try {
        const response = await fetch(`${API_URL}/companies`);
        if (response.ok) {
            const data = await response.json();
            allCompanies = data.companies;
            console.log(`✅ Loaded ${allCompanies.length} companies for autocomplete`);
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// Show autocomplete suggestions
function showAutocomplete(query) {
    const queryLower = query.toLowerCase();

    // Filter tradeshows first
    const tsMatches = availableTradeshows.filter(ts => ts.toLowerCase().includes(queryLower));

    // Filter companies
    const matches = allCompanies.filter(company => {
        const nameMatch = company.companyName?.toLowerCase().includes(queryLower);
        const linkMatch = company.companyLink?.toLowerCase().includes(queryLower);
        return nameMatch || linkMatch;
    }).slice(0, 8); // Limit to 8 company suggestions

    if (tsMatches.length === 0 && matches.length === 0) {
        autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No results found</div>';
        autocompleteDropdown.classList.remove('hidden');
        return;
    }

    // Create autocomplete items
    autocompleteDropdown.innerHTML = '';

    // Add tradeshow suggestions
    tsMatches.forEach(ts => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item tradeshow-suggestion';
        item.innerHTML = `
            <div class="autocomplete-item-name">
                <span class="suggestion-icon">🎪</span> 
                ${highlightMatch(ts, query)} (Exhibition)
            </div>
        `;
        item.addEventListener('click', () => {
            searchInput.value = ts;
            hideAutocomplete();
            performSearch();
        });
        autocompleteDropdown.appendChild(item);
    });

    // Add company suggestions
    matches.forEach(company => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="autocomplete-item-name">${highlightMatch(company.companyName, query)}</div>
            <div class="autocomplete-item-details">
                <span>📍 ${escapeHtml(company.hall)}</span>
                <span>🎪 ${escapeHtml(company.booth)}</span>
                <span class="source-hint">(${escapeHtml(company.source)})</span>
            </div>
        `;

        item.addEventListener('click', () => {
            searchInput.value = company.companyName;
            hideAutocomplete();
            performSearch();
        });

        autocompleteDropdown.appendChild(item);
    });

    autocompleteDropdown.classList.remove('hidden');
}

// Hide autocomplete
function hideAutocomplete() {
    autocompleteDropdown.classList.add('hidden');
}

// Highlight matching text
function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text);

    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return escapedText.replace(regex, '<strong style="background: rgba(99, 102, 241, 0.15); color: var(--primary-dark);">$1</strong>');
}

// Search Function
async function performSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        alert('Please enter a search term');
        return;
    }

    // Show loading state
    showLoading();

    try {
        const response = await fetch(`${API_URL}/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();
        currentResults = data.results;

        hideLoading();
        displayResults(currentResults);
    } catch (error) {
        console.error('Search error:', error);
        hideLoading();
        alert('Error performing search. Please make sure the server is running.');
    }
}

// Display Results
function displayResults(results) {
    // Hide no results message
    noResults.classList.add('hidden');

    if (results.length === 0) {
        resultsSection.classList.add('hidden');
        noResults.classList.remove('hidden');
        resultCount.textContent = '';
        return;
    }

    // Update result count
    resultCount.textContent = `Found ${results.length} ${results.length === 1 ? 'company' : 'companies'}`;

    // Clear previous results
    resultsContainer.innerHTML = '';

    // Create company cards
    results.forEach((company, index) => {
        const card = createCompanyCard(company, index);
        resultsContainer.appendChild(card);
    });

    // Show results section
    resultsSection.classList.remove('hidden');
}

// Create Company Card
function createCompanyCard(company, index) {
    const card = document.createElement('div');
    card.className = 'company-card';
    card.style.animationDelay = `${index * 0.05}s`;

    // Determine badge color based on source
    let badgeColor = '#6366f1'; // Default (Plastindia)
    if (company.source === 'IMTEX 2026') badgeColor = '#10b981';
    if (company.source === 'PlastEurasia 2024') badgeColor = '#f59e0b';
    if (company.source === 'K 2025') badgeColor = '#ef4444'; // Red
    if (company.source === 'ArabPlast 2025') badgeColor = '#8b5cf6'; // Purple
    if (company.source === 'IAA Transportation 2024') badgeColor = '#3b82f6'; // Blue
    if (company.source === 'EMO Hannover 2025') badgeColor = '#ec4899'; // Pink
    if (company.source === 'Blechexpo') badgeColor = '#0d9488'; // Teal
    if (company.source === 'Global Chem Expo 2026') badgeColor = '#f97316'; // Orange
    if (company.source === 'HIMTEX 2026') badgeColor = '#a855f7'; // Purple
    if (company.source === 'Chinaplas 2026') badgeColor = '#06b6d4'; // Cyan

    const badgeText = company.source || 'Plastindia 2026';

    card.innerHTML = `
        <div class="company-header">
            <h3 class="company-name">${escapeHtml(company.companyName)}</h3>
            <span class="source-badge" style="background: ${badgeColor};">${badgeText}</span>
        </div>
        
        <div class="company-details">
            <div class="detail-item">
                <span class="detail-label">📍 Hall:</span>
                <span>${escapeHtml(company.hall)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">🎪 Booth:</span>
                <span>${escapeHtml(company.booth)}</span>
            </div>
        </div>

        ${company.companyLink ? `
            <a href="${escapeHtml(company.companyLink)}" target="_blank" class="company-link">
                🔗 Visit Website →
            </a>
        ` : ''}

        ${company.profile ? `
            <div class="company-profile">
                <strong>Profile:</strong> ${escapeHtml(company.profile)}
            </div>
        ` : ''}

        ${company.aiSummary ? `
            <div class="ai-summary-container">
                <div class="ai-badge">AI Summary</div>
                <div class="ai-text">${escapeHtml(company.aiSummary)}</div>
            </div>
        ` : ''}

        <!-- Contact Information Section -->
        <div class="contact-info-section">
            ${company.gmailId ? `
                <div class="contact-item">
                    <span class="contact-icon">📧</span>
                    <span class="contact-text">${escapeHtml(company.gmailId)}</span>
                </div>
            ` : ''}
            ${company.contactNumber ? `
                <div class="contact-item">
                    <span class="contact-icon">📞</span>
                    <span class="contact-text">${escapeHtml(company.contactNumber)}</span>
                </div>
            ` : ''}
            ${company.companyAddress ? `
                <div class="contact-item">
                    <span class="contact-icon">📍</span>
                    <span class="contact-text">${escapeHtml(company.companyAddress)}</span>
                </div>
            ` : ''}
        </div>

        ${!company.aiSummary ? `
            <button class="ai-gen-btn" data-index="${index}">
                ✨ Generate AI Summary
            </button>
        ` : ''}
    `;

    // Add event listener for AI generation button
    const genBtn = card.querySelector('.ai-gen-btn');
    if (genBtn) {
        genBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.target;
            const originalText = btn.textContent;

            btn.disabled = true;
            btn.textContent = '🧠 Analyzing...';
            btn.classList.add('loading');

            try {
                const response = await fetch(`${API_URL}/enrich-real-data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ companies: [company] })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.companies.length > 0) {
                        const enrichedCompany = data.companies[0];
                        // Update the local storage/state
                        currentResults[index] = enrichedCompany;
                        // Replace the card content with updated one
                        const newCard = createCompanyCard(enrichedCompany, index);
                        card.replaceWith(newCard);
                        showNotification('AI Summary generated successfully! ✨', 'success');
                    }
                } else {
                    throw new Error('AI generation failed');
                }
            } catch (error) {
                console.error('AI Error:', error);
                btn.disabled = false;
                btn.textContent = originalText;
                btn.classList.remove('loading');
                alert('Error generating AI summary. Please check your API key.');
            }
        });
    }

    return card;
}

// Download File
async function downloadFile(format) {
    if (currentResults.length === 0) {
        alert('No results to download. Please perform a search first.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/download/${format}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ companies: currentResults }),
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        // Get filename from response header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `companies.${format === 'csv' ? 'csv' : 'xlsx'}`;

        if (contentDisposition) {
            const matches = /filename="(.+)"/.exec(contentDisposition);
            if (matches && matches[1]) {
                filename = matches[1];
            }
        }

        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);

        // Trigger download
        a.click();

        // Clean up after a delay to ensure download starts
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        // Show success message
        showNotification(`${format.toUpperCase()} file downloaded successfully! 🎉`, 'success');
        console.log(`📥 Download triggered: ${filename} (${blob.size} bytes)`);
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading file. Please try again.');
    }
}

// Show Loading State
function showLoading() {
    resultsSection.classList.add('hidden');
    noResults.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    resultCount.textContent = '';
}

// Hide Loading State
function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)'};
        color: white;
        padding: 18px 28px;
        border-radius: 14px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
        font-size: 1rem;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Load tradeshows
async function loadTradeshows() {
    try {
        const response = await fetch(`${API_URL}/tradeshows`);
        if (response.ok) {
            const data = await response.json();
            availableTradeshows = data.tradeshows;
            displayTradeshowChips(availableTradeshows);
            console.log(`✅ Loaded ${availableTradeshows.length} tradeshows`);
        }
    } catch (error) {
        console.error('Error loading tradeshows:', error);
    }
}

// Display tradeshow chips
function displayTradeshowChips(tradeshows) {
    tradeshowContainer.innerHTML = '';
    tradeshows.forEach(ts => {
        const chip = document.createElement('div');
        chip.className = 'tradeshow-chip';
        chip.textContent = ts;
        chip.addEventListener('click', () => {
            searchInput.value = ts;
            performSearch();
        });
        tradeshowContainer.appendChild(chip);
    });
}

// Initialize
loadAllCompanies();
loadTradeshows();

console.log('✨ ExpoDirectory Search Engine - Ready!');
console.log('✨ Autocomplete enabled - Start typing to see suggestions');
console.log('Make sure the server is running on http://localhost:3000');
