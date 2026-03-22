import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generates a concise business summary for a company based on its website text or profile.
 * @param {string} companyName - Name of the company.
 * @param {string} rawText - Scraped text from the company's website or trade show profile.
 * @returns {Promise<string>} - Human-readable summary.
 */
export async function generateBusinessSummary(companyName, rawText) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is not defined in environment variables.");
        return "";
    }

    if (!rawText || rawText.length < 50) {
        return "";
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using 'gemini-flash-latest' as it has been verified to work with this API key
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
      You are an expert business analyst. I will provide you with raw text scraped from the website or profile of a company named "${companyName}".
      Your task is to provide a concise, human-readable summary (2-3 sentences max) of what this company actually does, their main products or services, and their primary industry.
      
      Avoid marketing jargon. Be direct and factual.
      
      Raw text:
      "${rawText.substring(0, 5000)}"
      
      Summary:
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        return text;
    } catch (error) {
        console.error(`❌ Gemini API Error for ${companyName}:`, error.message);
        return "";
    }
}
