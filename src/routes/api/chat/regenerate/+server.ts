import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';
import { buildSystemPrompt, getLorebookData, getSessionLoreSnapshot } from "$lib/helpers/lorebookManager";

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});


// ------------------------------
// POST handler
// ------------------------------
export async function POST({ request }) {
    const { chatId, messages } = await request.json();

    if (!Array.isArray(messages)) {
        return json({ error: "Invalid messages" }, { status: 400 });
    }

    try {
        // Get session snapshot
        const sessionData = chatId ? await getSessionLoreSnapshot(chatId) : {
            characters: [], places: [], quests: [], plot_points: [], history: []
        };

        // Only fetch lorebook if session is empty
        let lorebookData = null;
        if (chatId && !sessionData.characters.length && !sessionData.places.length && !sessionData.quests.length) {
            lorebookData = await getLorebookData(chatId);
        }

        // Build system prompt
        const enhancedMessages = [...messages];
        if (enhancedMessages[0].role === 'system') {
            enhancedMessages[0].content = await buildSystemPrompt(enhancedMessages[0].content, sessionData, chatId, lorebookData);
        }

        // Generate AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: enhancedMessages,
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 1024
        });

        const aiReply = completion.choices[0].message.content ?? "";

        return json({ option: aiReply });
    } catch (err) {
        console.error(err);
        return json({ error: "AI regeneration failed" }, { status: 500 });
    }
}
