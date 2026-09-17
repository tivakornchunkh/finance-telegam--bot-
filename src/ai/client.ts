import { GoogleGenAI } from '@google/genai';
import { getConfig } from '../config/config.js';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const config = getConfig();
    aiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }
  return aiClient;
}

export async function generateContentWithRetry(params: {
  contents: any[];
  config?: any;
}): Promise<any> {
  const ai = getGeminiClient();
  const appConfig = getConfig();
  const modelsToTry = [appConfig.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'];

  let lastError: any = null;
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('429')) {
          console.warn(`[AI Retry] Model ${model} busy (attempt ${attempt}). Waiting 1.2s...`);
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
