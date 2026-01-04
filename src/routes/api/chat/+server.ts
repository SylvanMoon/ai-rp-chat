import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

// Helper to save a message
async function saveMessage(chatId: string, role: string, content: string) {
    const { error } = await supabase
        .from("messages")
        .insert([{ chat_id: chatId, role, content }]);

    if (error) console.error("Supabase saveMessage error:", error);
}

export async function POST({ request }) {
    const { chatId, messages } = await request.json();

    if (!chatId || !Array.isArray(messages)) {
        return json({ error: "Missing chatId or invalid messages" }, { status: 400 });
    }

    try {
        // Save the latest user message to Supabase
        const userMessage = messages[messages.length - 1];
        if (userMessage.role === "user") {
            await saveMessage(chatId, "user", userMessage.content);
        }

        // Ask NVIDIA NIM for AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages,
            temperature: 0.6,
            top_p: 0.7,
            max_tokens: 1024
        });

        const aiReply = completion.choices[0].message.content ?? "";

        // Save AI reply to Supabase
        await saveMessage(chatId, "assistant", aiReply);

        return json({ reply: aiReply });
    } catch (err) {
        console.error(err);
        return json({ error: "AI request failed" }, { status: 500 });
    }
}
