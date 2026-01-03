import { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const geminiModel = async (prompt: string) => {
  try {
    const temp = {
      model: 'gemini-2.5-flash',
      contents: prompt
    }
    const count = await ai.models.countTokens(temp);
    console.log("NO OF TOKENS GIVEN TO LLM: ", count.totalTokens);
    const result: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        // This tells Gemini to ONLY return valid JSON
        responseMimeType: 'application/json',
      },
    });

    return result;
  } catch (err) {
    console.log(err);
  }
};
