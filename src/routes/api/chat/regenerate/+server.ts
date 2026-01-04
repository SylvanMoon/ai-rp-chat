import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

export async function POST({ request }) {
    const { messages } = await request.json();

    if (!Array.isArray(messages)) {
        return json({ error: "Invalid messages" }, { status: 400 });
    }

    try {
        // Generate one AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages,
            temperature: 0.8, // Higher temperature for more variety
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