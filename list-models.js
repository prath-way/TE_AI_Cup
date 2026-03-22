import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Fetch available Gemini models directly via Node
 */
async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const logFile = "models-list.log";

    try {
        console.log(`📡 Fetching models from: ${url}`);
        const response = await axios.get(url);
        const models = response.data.models.map(m => m.name);
        fs.writeFileSync(logFile, models.join('\n'));
        console.log(`✅ Found ${models.length} models. Saved to ${logFile}.`);
    } catch (error) {
        fs.writeFileSync(logFile, `❌ Error: ${error.message}\n`);
        if (error.response) {
            fs.appendFileSync(logFile, `❌ Status: ${error.response.status}\n`);
            fs.appendFileSync(logFile, `❌ Data: ${JSON.stringify(error.response.data, null, 2)}\n`);
        }
    }
}

listModels();
