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

// Helper to get lorebook data for a chat
async function getLorebookData(chatId: string) {
    const { data: chat } = await supabase
        .from('chats')
        .select('lorebook_id')
        .eq('id', chatId)
        .single();

    if (!chat?.lorebook_id) return null;

    const [lorebookRes, charactersRes, placesRes, questsRes] = await Promise.all([
        supabase.from('lorebooks').select('*').eq('id', chat.lorebook_id).single(),
        supabase.from('lore_characters').select('*').eq('lorebook_id', chat.lorebook_id),
        supabase.from('lore_places').select('*').eq('lorebook_id', chat.lorebook_id),
        supabase.from('lore_quests').select('*').eq('lorebook_id', chat.lorebook_id)
    ]);

    if (lorebookRes.error) return null;

    return {
        lorebook: lorebookRes.data,
        characters: charactersRes.data || [],
        places: placesRes.data || [],
        quests: questsRes.data || []
    };
}

// Helper to build enhanced system prompt with lorebook data
function buildSystemPrompt(basePrompt: string, lorebookData: any) {
    if (!lorebookData) return basePrompt;

    const { lorebook, characters, places, quests } = lorebookData;

    let enhancedPrompt = basePrompt + '\n\n';

    enhancedPrompt += `You have access to the following lorebook "${lorebook.name}": ${lorebook.description}\n\n`;

    if (characters.length > 0) {
        enhancedPrompt += 'CHARACTERS:\n';
        characters.forEach((char: any) => {
            enhancedPrompt += `- ${char.name}: ${char.description}\n`;
            if (char.relationships) {
                enhancedPrompt += `  Relationships: ${JSON.stringify(char.relationships)}\n`;
            }
            if (char.aliases && char.aliases.length > 0) {
                enhancedPrompt += `  Aliases: ${char.aliases.join(', ')}\n`;
            }
        });
        enhancedPrompt += '\n';
    }

    if (places.length > 0) {
        enhancedPrompt += 'PLACES:\n';
        places.forEach((place: any) => {
            enhancedPrompt += `- ${place.name}: ${place.description}\n`;
        });
        enhancedPrompt += '\n';
    }

    if (quests.length > 0) {
        enhancedPrompt += 'QUESTS:\n';
        quests.forEach((quest: any) => {
            enhancedPrompt += `- ${quest.description}\n`;
            if (quest.involved_characters && quest.involved_characters.length > 0) {
                enhancedPrompt += `  Involved characters: ${quest.involved_characters.join(', ')}\n`;
            }
        });
        enhancedPrompt += '\n';
    }

    enhancedPrompt += 'Use this lorebook information to enrich your roleplaying responses. Stay in character and reference the lorebook elements naturally when appropriate.';

    return enhancedPrompt;
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

        // Get lorebook data for this chat
        const lorebookData = await getLorebookData(chatId);

        // Enhance the system prompt with lorebook data
        const enhancedMessages = [...messages];
        if (enhancedMessages[0].role === 'system') {
            enhancedMessages[0].content = buildSystemPrompt(enhancedMessages[0].content, lorebookData);
        }

        // Ask NVIDIA NIM for AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: enhancedMessages,
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
