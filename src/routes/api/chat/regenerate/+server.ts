import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

// ------------------------------
// Helper: Get session snapshot for a chat
// ------------------------------
async function getSessionSnapshot(chatId: string) {
    const [
        charactersRes,
        placesRes,
        questsRes,
        plotPointsRes,
        historyRes
    ] = await Promise.all([
        supabase.from('session_characters')
            .select(`notes, ephemeral, lore_characters(id,name,description,relationships,aliases)`)
            .eq('chat_id', chatId),
        supabase.from('session_places')
            .select(`notes, ephemeral, lore_places(id,name,description)`)
            .eq('chat_id', chatId),
        supabase.from('session_quests')
            .select(`status, notes, ephemeral, lore_quests(id,title,description)`)
            .eq('chat_id', chatId),
        supabase.from('session_plot_points')
            .select(`id, notes, status, ephemeral`)
            .eq('chat_id', chatId),
        supabase.from('session_history')
            .select(`id, timestamp, summary, notes`)
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: true })
    ]);

    return {
        characters: charactersRes.data?.map(r => ({
            ...(r.lore_characters as any),
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        places: placesRes.data?.map(r => ({
            ...(r.lore_places as any),
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        quests: questsRes.data?.map(r => ({
            ...(r.lore_quests as any),
            status: r.status,
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        plot_points: plotPointsRes.data ?? [],
        history: historyRes.data ?? []
    };
}

// ------------------------------
// Helper: Optional lorebook fallback
// ------------------------------
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

// ------------------------------
// Helper: Build system prompt from session (and optionally lorebook fallback)
// ------------------------------
function buildSystemPrompt(basePrompt: string, sessionData: any, lorebookData: any = null) {
    let prompt = basePrompt.trim() + '\n\n';
    const { characters, places, quests, plot_points, history } = sessionData;

    // Session data
    if (characters.length) {
        prompt += 'KNOWN CHARACTERS:\n';
        characters.forEach((c: any) => {
            prompt += `- ${c.name}: ${c.description}\n`;
            if (c.relationships) prompt += `  Relationships: ${JSON.stringify(c.relationships)}\n`;
            if (c.notes) prompt += `  Notes: ${c.notes}\n`;
        });
        prompt += '\n';
    }

    if (places.length) {
        prompt += 'KNOWN PLACES:\n';
        places.forEach((p: any) => {
            prompt += `- ${p.name}: ${p.description}\n`;
            if (p.notes) prompt += `  Notes: ${p.notes}\n`;
        });
        prompt += '\n';
    }

    if (quests.length) {
        prompt += 'ACTIVE QUESTS:\n';
        quests.forEach((q: any) => {
            prompt += `- ${q.title}: ${q.description} (Status: ${q.status})\n`;
            if (q.notes) prompt += `  Notes: ${q.notes}\n`;
        });
        prompt += '\n';
    }

    if (plot_points.length) {
        prompt += 'CURRENT PLOT POINTS:\n';
        plot_points.forEach((p: any) => {
            prompt += `- ${p.notes} (Status: ${p.status ?? 'active'})${p.ephemeral ? ' [ephemeral]' : ''}\n`;
        });
        prompt += '\n';
    }

    if (history.length) {
        prompt += 'SESSION HISTORY:\n';
        history.forEach((h: any) => {
            prompt += `- ${new Date(h.timestamp).toISOString()}: ${h.summary}`;
            if (h.notes) prompt += ` (${h.notes})`;
            prompt += '\n';
        });
        prompt += '\n';
    }

    // Optional fallback to lorebook if session is empty
    if ((!characters.length && !places.length && !quests.length) && lorebookData) {
        prompt += `You may reference this lorebook if needed: "${lorebookData.lorebook.name}"\n`;
        prompt += `${lorebookData.lorebook.description}\n`;
    }

    prompt += `
Rules for Game Master:
- Respect existing session lore (characters, places, quests) as accurate.
- You may invent temporary NPCs, events, or locations to drive the story.
- Temporary entities do not become permanent unless explicitly added to session lore.
- Stay in character and narrate naturally.
`;

    return prompt;
}

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
        const sessionData = chatId ? await getSessionSnapshot(chatId) : {
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
            enhancedMessages[0].content = buildSystemPrompt(enhancedMessages[0].content, sessionData, lorebookData);
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
