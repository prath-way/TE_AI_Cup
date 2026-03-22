import { generateBusinessSummary } from "./services/geminiService.js";
import dotenv from "dotenv";

dotenv.config();

const companyName = "Test Company";
const rawText = "We are a manufacturer of high-precision plastic injection molding machines based in Germany. Our machines are used in automotive and medical industries for over 50 years.";

async function run() {
    try {
        console.log(`📡 Calling generateBusinessSummary...`);
        const summary = await generateBusinessSummary(companyName, rawText);
        if (summary) {
            console.log('✅ Success: ' + summary);
        } else {
            console.log('❌ Failed: No summary returned');
        }
    } catch (err) {
        console.error('❌ Caught Error: ' + err.message);
        if (err.stack) console.error(err.stack);
    }
}

run();