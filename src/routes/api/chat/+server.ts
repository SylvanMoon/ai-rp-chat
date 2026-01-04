import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

// ------------------------------
// Type definitions
// ------------------------------
interface SessionCharacter {
    id: string;
    name: string;
    description: string;
    relationships?: any;
    aliases?: string[];
    notes?: string;
    ephemeral?: boolean;
}

interface SessionPlace {
    id: string;
    name: string;
    description: string;
    notes?: string;
    ephemeral?: boolean;
}

interface SessionQuest {
    id: string;
    title: string;
    description: string;
    status?: string;
    notes?: string;
    ephemeral?: boolean;
}

interface SessionPlotPoint {
    id: string;
    notes: string;
    status?: string;
    ephemeral?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface SessionHistoryEvent {
    id: string;
    timestamp: string;
    summary: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

interface SessionLoreData {
    lorebook?: { name: string; description: string } | null;
    characters: SessionCharacter[];
    places: SessionPlace[];
    quests: SessionQuest[];
    plot_points: SessionPlotPoint[];
    history: SessionHistoryEvent[];
}

// ------------------------------
// Save a chat message
// ------------------------------
async function saveMessage(chatId: string, role: string, content: string) {
    const { error } = await supabase
        .from("messages")
        .insert([{ chat_id: chatId, role, content }]);
    if (error) console.error("Supabase saveMessage error:", error);
}

// ------------------------------
// Get session lore snapshot
// ------------------------------
async function getSessionLoreSnapshot(chatId: string): Promise<SessionLoreData> {
    const { data: chat } = await supabase
        .from('chats')
        .select('lorebook_id')
        .eq('id', chatId)
        .single();

    let lorebook = null;
    if (chat?.lorebook_id) {
        const { data } = await supabase
            .from('lorebooks')
            .select('name, description')
            .eq('id', chat.lorebook_id)
            .single();
        lorebook = data;
    }

    const [charactersRes, placesRes, questsRes, plotPointsRes, historyRes] = await Promise.all([
        supabase.from('session_characters').select(`notes, ephemeral, lore_characters(id,name,description,relationships,aliases)`).eq('chat_id', chatId),
        supabase.from('session_places').select(`notes, ephemeral, lore_places(id,name,description)`).eq('chat_id', chatId),
        supabase.from('session_quests').select(`status, notes, ephemeral, lore_quests(id,title,description)`).eq('chat_id', chatId),
        supabase.from('session_plot_points').select(`id, notes, status, ephemeral`).eq('chat_id', chatId),
        supabase.from('session_history').select(`id, timestamp, summary, notes`).eq('chat_id', chatId).order('timestamp', { ascending: true })
    ]);

    return {
        lorebook,
        characters: charactersRes.data?.map(r => ({
            ...(r.lore_characters as unknown as SessionCharacter),
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        places: placesRes.data?.map(r => ({
            ...(r.lore_places as unknown as SessionPlace),
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        quests: questsRes.data?.map(r => ({
            ...(r.lore_quests as unknown as SessionQuest),
            status: r.status,
            notes: r.notes,
            ephemeral: r.ephemeral || false
        })) ?? [],
        plot_points: plotPointsRes.data ?? [],
        history: historyRes.data ?? []
    };
}

// ------------------------------
// Build system prompt
// ------------------------------
function buildSystemPrompt(basePrompt: string, sessionLoreData: SessionLoreData) {
    if (!sessionLoreData) return basePrompt;

    const { lorebook, characters, places, quests, plot_points, history } = sessionLoreData;

    let prompt = basePrompt.trim() + '\n\n';

    if (lorebook) prompt += `Setting: ${lorebook.name}\n\n`;

    if (characters.length) {
        prompt += 'KNOWN CHARACTERS:\n';
        characters.forEach(c => {
            prompt += `- ${c.name}: ${c.description}\n`;
            if (c.relationships) prompt += `  Relationships: ${JSON.stringify(c.relationships)}\n`;
            if (c.notes) prompt += `  Notes: ${c.notes}\n`;
        });
        prompt += '\n';
    }

    if (places.length) {
        prompt += 'KNOWN PLACES:\n';
        places.forEach(p => {
            prompt += `- ${p.name}: ${p.description}\n`;
            if (p.notes) prompt += `  Notes: ${p.notes}\n`;
        });
        prompt += '\n';
    }

    if (quests.length) {
        prompt += 'ACTIVE QUESTS:\n';
        quests.forEach(q => {
            prompt += `- ${q.title}: ${q.description} (Status: ${q.status})\n`;
            if (q.notes) prompt += `  Notes: ${q.notes}\n`;
        });
        prompt += '\n';
    }

    if (plot_points.length) {
        prompt += 'CURRENT PLOT POINTS:\n';
        plot_points.forEach(p => {
            prompt += `- ${p.notes} (Status: ${p.status ?? 'active'})${p.ephemeral ? ' [ephemeral]' : ''}\n`;
        });
        prompt += '\n';
    }

    if (history.length) {
        prompt += 'SESSION HISTORY:\n';
        history.forEach(h => {
            prompt += `- ${new Date(h.timestamp).toISOString()}: ${h.summary}`;
            if (h.notes) prompt += ` (${h.notes})`;
            prompt += '\n';
        });
        prompt += '\n';
    }

    prompt += `
Rules for Game Master:
- Respect existing session lore.
- Temporary NPCs, events, or locations do not become permanent unless explicitly added.
- Stay in character and narrate naturally.
`;

    return prompt;
}

// ------------------------------
// Add ephemeral entity
// ------------------------------
async function addEphemeralEntity(chatId: string, type: 'character' | 'place' | 'quest', loreId: string, notes?: string) {
    const tableMap = { character: 'session_characters', place: 'session_places', quest: 'session_quests' } as const;
    const columnMap = { character: 'character_id', place: 'place_id', quest: 'quest_id' } as const;
    const table = tableMap[type];
    const column = columnMap[type];

    try {
        const { data, error: selectError } = await supabase
            .from(table)
            .select('id')
            .eq('chat_id', chatId)
            .eq(column, loreId)
            .single();

        if (selectError) return console.error(`Check ephemeral ${type} error:`, selectError);

        if (!data) {
            const { error: insertError } = await supabase.from(table).insert({ chat_id: chatId, [column]: loreId, notes, ephemeral: true });
            if (insertError) console.error(`Insert ephemeral ${type} error:`, insertError);
        }
    } catch (err) {
        console.error(`Unexpected error in addEphemeralEntity (${type}):`, err);
    }
}

// ------------------------------
// Add ephemeral plot point
// ------------------------------
async function addEphemeralPlotPoint(chatId: string, notes: string, status: string = 'active') {
    try {
        const { error } = await supabase.from('session_plot_points').insert({ chat_id: chatId, notes, status, ephemeral: true });
        if (error) console.error('Error adding ephemeral plot point:', error);
    } catch (err) {
        console.error('Unexpected error in addEphemeralPlotPoint:', err);
    }
}

// ------------------------------
// Add history event
// ------------------------------
async function addHistoryEvent(chatId: string, summary: string, notes?: string) {
    try {
        const { error } = await supabase.from('session_history').insert({ chat_id: chatId, summary, notes });
        if (error) console.error('Error adding history event:', error);
    } catch (err) {
        console.error('Unexpected error in addHistoryEvent:', err);
    }
}

// ------------------------------
// Get messages since last user message (for ephemeral extraction)
// ------------------------------
async function getMessagesSinceLastUser(chatId: string) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    // Find last user message index
    let lastUserIndex = -1;
    data.forEach((msg, idx) => {
        if (msg.role === 'user') lastUserIndex = idx;
    });

    // Return all messages **since the last user message**
    return lastUserIndex >= 0 ? data.slice(lastUserIndex) : [];
}

// ------------------------------
// POST handler
// ------------------------------
export async function POST({ request }) {
    const { chatId, messages } = await request.json();

    if (!chatId || !Array.isArray(messages)) return json({ error: "Missing chatId or invalid messages" }, { status: 400 });

    try {
        // Save latest user message
        const userMessage = messages[messages.length - 1];
        if (userMessage.role === "user") await saveMessage(chatId, "user", userMessage.content);

        // Extract ephemeral entities **only after a user message**
        const recentMessages = await getMessagesSinceLastUser(chatId);
        // Here you would parse `recentMessages` for ephemeral characters, plot points, etc.
        // Example: addEphemeralPlotPoint(chatId, "Detected ephemeral plot point");
        // Example: addEphemeralEntity(chatId, 'character', detectedLoreId, "AI introduced this NPC");

        // Get session snapshot for system prompt
        const sessionLoreData = await getSessionLoreSnapshot(chatId);

        // Build enhanced system prompt
        const enhancedMessages = [...messages];
        if (enhancedMessages[0].role === 'system') {
            enhancedMessages[0].content = buildSystemPrompt(enhancedMessages[0].content, sessionLoreData);
        }

        // Generate AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: enhancedMessages,
            temperature: 0.6,
            top_p: 0.7,
            max_tokens: 1024
        });

        const aiReply = completion.choices[0].message.content ?? "";

        // Save AI response
        await saveMessage(chatId, "assistant", aiReply);

        return json({ reply: aiReply });
    } catch (err) {
        console.error(err);
        return json({ error: "AI request failed" }, { status: 500 });
    }
}
