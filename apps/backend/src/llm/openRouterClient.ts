import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.MISTRAL_API_KEY || 'your_api_key';

const client = new Mistral({ apiKey: apiKey });

export const openRouterModel = async (prompt: string) => {
  // Ensure prompt is a plain string
  const promptStr = String(prompt).trim();

  console.log('Prompt type:', typeof promptStr);
  console.log('Prompt value:', promptStr);

  const chatResponse = await client.chat.complete({
    model: 'devstral-2512',
    messages: [
      {
        role: 'user',
        content: promptStr,
      },
    ],
  });

  return chatResponse;
};
