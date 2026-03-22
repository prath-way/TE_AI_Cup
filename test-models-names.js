import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function testModel(modelName) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'OK'");
        const text = result.response.text();
        console.log(`✅ ${modelName} works! Response: ${text}`);
    } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}`);
    }
}

async function run() {
    await testModel("gemini-1.5-flash-8b");
    await testModel("gemini-flash-latest");
    await testModel("gemini-1.5-pro");
}

run();
