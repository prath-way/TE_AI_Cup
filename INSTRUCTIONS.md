# GET ALL COMPANY DATA - STEP BY STEP

## What You'll Get
- **ALL 2000+ companies** from the website
- Company Name
- Hall Number  
- Booth Number
- Company Website Link
- Company Profile

## Instructions (Takes 3 minutes)

### Step 1: Open the Website
1. Open Google Chrome or Firefox
2. Go to: https://exhibitors.plastindia.org/ExhList/eDirectoryList
3. **IMPORTANT:** Scroll down to the bottom of the page to load ALL companies
4. Wait until you see all companies loaded

### Step 2: Open Developer Console
1. Press **F12** on your keyboard
2. Click the **"Console"** tab at the top

### Step 3: Run the Extraction Script
1. Open this file in Notepad: `C:\Users\Asus\OneDrive\Desktop\TE\EXTRACT_ALL_COMPANIES.js`
2. **Copy ALL the code** (Ctrl+A, then Ctrl+C)
3. **Paste** into the browser console (Ctrl+V)
4. Press **Enter**

### Step 4: Save the Data
1. The data is now copied to your clipboard automatically
2. Create a new file: `C:\Users\Asus\OneDrive\Desktop\TE\companies_full.json`
3. Open it in Notepad
4. **Paste** the data (Ctrl+V)
5. **Save** the file (Ctrl+S)

### Step 5: Update Excel Script
1. Open: `C:\Users\Asus\OneDrive\Desktop\TE\excel.js`
2. Find line 4: `const data=JSON.parse(fs.readFileSync("./companies.json","utf-8"));`
3. Change to: `const data=JSON.parse(fs.readFileSync("./companies_full.json","utf-8"));`
4. Save the file

### Step 6: Generate Excel File
1. Open PowerShell in the TE folder
2. Run: `node excel.js`
3. Done! Check `companies.xlsx` - it will have ALL companies!

## Troubleshooting

**If copy() doesn't work:**
- The script will also display the data in console
- Right-click on the output → "Copy object"
- Or manually copy the JSON output

**If you see "Not specified":**
- Make sure you scrolled to the bottom before running the script
- The website loads data dynamically as you scroll

**Need help?**
- The script shows progress: "Processed 100 companies..."
- Final count will show how many companies were found
- Sample data is displayed to verify it's working

## What the Script Does
✓ Finds ALL company entries on the page
✓ Extracts company name, hall, booth, website
✓ Removes duplicates
✓ Formats as JSON
✓ Copies to clipboard automatically
✓ Shows statistics and samples

This is the ONLY way to get the data because the website blocks automated tools!
