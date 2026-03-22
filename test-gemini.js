import { execSync } from "child_process";
import fs from "fs";

/**
 * Enhanced test script to capture all stdout/stderr
 */
function runTest() {
    const logFile = "test-error.log";
    fs.writeFileSync(logFile, "🚀 Starting Enhanced Gemini Test...\n");

    try {
        // We'll create a small standalone script that just calls the service
        const testRunnerCode = `
import { generateBusinessSummary } from "./services/geminiService.js";
import dotenv from "dotenv";
dotenv.config();

const companyName = "Test Company";
const rawText = "We are a manufacturer of high-precision plastic injection molding machines based in Germany. Our machines are used in automotive and medical industries for over 50 years.";

generateBusinessSummary(companyName, rawText).then(summary => {
    if (summary) {
        console.log('✅ Success: ' + summary);
    } else {
        console.log('❌ Failed: No summary returned');
    }
}).catch(err => {
    console.error('❌ Async Error: ' + err.message);
});
        `;

        fs.writeFileSync("temp-test-runner.js", testRunnerCode);

        const output = execSync("node temp-test-runner.js", { encoding: "utf-8", stdio: "pipe" });
        fs.appendFileSync(logFile, output);
    } catch (error) {
        fs.appendFileSync(logFile, `❌ Exec Error: ${error.message}\n`);
        if (error.stderr) {
            fs.appendFileSync(logFile, `❌ Stderr: ${error.stderr}\n`);
        }
        if (error.stdout) {
            fs.appendFileSync(logFile, `❌ Stdout: ${error.stdout}\n`);
        }
    }
}

runTest();
