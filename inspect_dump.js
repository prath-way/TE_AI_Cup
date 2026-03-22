import fs from 'fs';
import * as cheerio from 'cheerio';

try {
    const html = fs.readFileSync('interplas_dump.html', 'utf8');
    const $ = cheerio.load(html);
    const nextDataScript = $('#__NEXT_DATA__');

    if (nextDataScript.length > 0) {
        const jsonData = JSON.parse(nextDataScript.html());
        
        let pathList = [];
        
        function traverse(obj, path = '', depth = 0) {
            if (depth > 8) return; 
            if (pathList.length > 2000) return; 

            if (Array.isArray(obj)) {
                 pathList.push(`${path} [Array: ${obj.length}]`);
                 if (obj.length > 0) {
                     // Check if it's an array of strings or primitives, assume it's data
                     if (typeof obj[0] !== 'object') {
                         pathList.push(`${path} Example: ${obj[0]}`);
                     } else {
                         // Drill down into first element to see structure
                         traverse(obj[0], `${path}[0]`, depth + 1);
                     }
                 }
            } else if (obj && typeof obj === 'object') {
                for (const key in obj) {
                    const newPath = path ? `${path}.${key}` : key;
                    const val = obj[key];
                    let info = `(${typeof val})`;
                    if (Array.isArray(val)) info = `[Array: ${val.length}]`;
                    
                    pathList.push(`${newPath} ${info}`);

                    // Heuristics to decide whether to go deeper
                    // Always query 'props', 'pageProps', 'queries', 'mutations', 'state'
                    // Also generic 'children' or 'data' if high up
                    const keyLower = key.toLowerCase();
                    const interestingKeys = ['props', 'pageprops', 'initialstate', 'dehydratedstate', 'queries', 'querykey', 'data', 'json', 'nodes', 'edges', 'filters', 'facets', 'apollostate', 'redux'];
                    
                    if (interestingKeys.some(k => keyLower.includes(k)) || depth < 4) {
                        traverse(val, newPath, depth + 1);
                    }
                }
            }
        }

        traverse(jsonData);
        fs.writeFileSync('json_structure.txt', pathList.join('\n'));
        console.log("Structure saved to json_structure.txt");

    } else {
        console.log("Script not found");
    }
} catch(e) { console.error(e); }
