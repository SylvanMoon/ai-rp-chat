import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NVIDIA_API_KEY, GEMINI_API_KEY, AI } from '$env/static/private';

const deepseekClient = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function generateResponse(messages: any[], options?: any) {
    if (AI === 'gemini') {
        // Convert messages to Gemini format
        // Gemini doesn't support system role directly; prepend system to first user message
        let systemMessage = '';
        const contents = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemMessage = msg.content;
            } else {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                const text = systemMessage ? systemMessage + '\n\n' + msg.content : msg.content;
                contents.push({
                    role,
                    parts: [{ text }]
                });
                systemMessage = ''; // Only prepend to first non-system message
            }
        }

        const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
        const response = await model.generateContent({
            contents: contents,
            generationConfig: {
                temperature: options?.temperature || 0.9,
                topP: options?.top_p || 0.98,
                maxOutputTokens: options?.max_tokens || 2048,
            }
        });

        return { choices: [{ message: { content: response.response.text() } }] };
    } else {
        // DeepSeek via OpenAI client
        return await deepseekClient.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages,
            temperature: options?.temperature || 0.9,
            top_p: options?.top_p || 0.98,
            max_tokens: options?.max_tokens || 2048,
            frequency_penalty: options?.frequency_penalty || 0.15,
            presence_penalty: options?.presence_penalty || 0.1,
            stop: options?.stop || [
                "\nYou:",
                "\nUser:",
                "\n<USER>:"
            ]
        });
    }
}