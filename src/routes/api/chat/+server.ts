import { json } from "@sveltejs/kit";
import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});

const SUMMARY_THRESHOLD = 20;
const PLOT_POINT_THRESHOLD = 6;

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
// Get or create lore character
// ------------------------------
async function getOrCreateLoreCharacter(name: string, description: string = 'Ephemeral character'): Promise<string> {
    const { data, error } = await supabase
        .from('lore_characters')
        .select('id')
        .eq('name', name)
        .maybeSingle();

    if (data) return data.id;

    const { data: newData, error: insertError } = await supabase
        .from('lore_characters')
        .insert({ name, description })
        .select('id')
        .maybeSingle();

    if (insertError) throw insertError;
    return newData?.id || '';
}

async function getOrCreateLorePlace(
    name: string,
    chatId: string,
    description: string = 'Ephemeral place'
): Promise<string> {
    // Get the lorebook_id for this chat
    const { data: chat } = await supabase
        .from('chats')
        .select('lorebook_id')
        .eq('id', chatId)
        .single();

    const lorebookId = chat?.lorebook_id;
    if (!lorebookId) throw new Error('Cannot create ephemeral place: chat has no lorebook_id');

    // Check if the place already exists in this lorebook
    const { data, error } = await supabase
        .from('lore_places')
        .select('id')
        .eq('name', name)
        .eq('lorebook_id', lorebookId)
        .single();

    if (data) return data.id;

    const { data: newData, error: insertError } = await supabase
        .from('lore_places')
        .insert({ name, description, lorebook_id: lorebookId })
        .select('id')
        .single();

    if (insertError) throw insertError;
    return newData.id;
}

// ------------------------------
// Get or create lore quest
// ------------------------------
async function getOrCreateLoreQuest(title: string, description: string = 'Ephemeral quest'): Promise<string> {
    const { data, error } = await supabase
        .from('lore_quests')
        .select('id')
        .eq('title', title)
        .maybeSingle();

    if (data) return data.id;

    const { data: newData, error: insertError } = await supabase
        .from('lore_quests')
        .insert({ title, description })
        .select('id')
        .maybeSingle();

    if (insertError) throw insertError;
    return newData?.id || '';
}

// ------------------------------
// Fetch messages since the previous user message
// ------------------------------
async function getMessagesSinceLastUser(chatId: string): Promise<{ role: string; content: string }[]> {
    try {
        // Get all messages for this chat ordered by insertion
        const { data: messages, error } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages for ephemeral parsing:', error);
            return [];
        }

        if (!messages || messages.length === 0) return [];

        // Find the index of the last user message
        let lastUserIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserIndex = i;
                break;
            }
        }

        if (lastUserIndex === -1) {
            // No previous user messages, return all messages
            return messages.map(m => ({ role: m.role, content: m.content }));
        }

        // Include the last AI message before the last user (if it exists)
        const startIndex = Math.max(0, lastUserIndex - 1);

        // Return messages from that index onward
        return messages.slice(startIndex).map(m => ({ role: m.role, content: m.content }));
    } catch (err) {
        console.error('Unexpected error in getMessagesSinceLastUser:', err);
        return [];
    }
}

// ------------------------------
// Helper: Extract ephemeral entities using LLM
// ------------------------------
async function extractEphemeralEntitiesLLM(recentMessages: { role: string; content: string }[]) {
    if (!recentMessages.length) return null;

    // Build a single string for context
    const conversation = recentMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const systemPrompt = `
You are a Game Master assistant. 
Your task is to extract **all new ephemeral entities** mentioned in the conversation. 
Ephemeral entities include:
- Characters: name, optional description
- Places: name, optional description
- Quests: title, optional description
- Plot points: notes
- History events: summary

**Output JSON only**, in this format:
{
  "characters": [{"name": "...", "description": "..."}, ...],
  "places": [{"name": "...", "description": "..."}, ...],
  "quests": [{"title": "...", "description": "..."}, ...],
  "plot_points": [{"notes": "..."}, ...],
  "events": [{"summary": "..."} ...]
}

Do not include any existing entities that are already in the session (we will filter duplicates later). 
Do not output plain text, only JSON.
`;

    try {
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: conversation }
            ],
            temperature: 0,
            max_tokens: 1024
        });

        const reply = completion.choices[0].message.content ?? '';
        // Extract JSON from markdown code block if present
        const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : reply;
        // Attempt to parse JSON
        return JSON.parse(jsonString);
    } catch (err) {
        console.error("Failed to extract ephemeral entities:", err);
        return null;
    }
}

// ------------------------------
// Helper: Insert ephemeral data into session tables
// ------------------------------
async function insertEphemeralData(chatId: string, data: any) {
    if (!data) return;

    // Insert characters
    if (data.characters?.length) {
        for (const c of data.characters) {
            try {
                // Use getOrCreateLoreCharacter to ensure a permanent lore ID exists
                const loreId = await getOrCreateLoreCharacter(c.name, c.description);
                await addEphemeralEntity(chatId, 'character', loreId, 'Detected ephemeral from LLM');
            } catch (err) {
                console.error("Error inserting ephemeral character:", err);
            }
        }
    }

    // Insert places
    if (data.places?.length) {
        for (const p of data.places) {
            try {
                const loreId = await getOrCreateLorePlace(p.name, p.description);
                await addEphemeralEntity(chatId, 'place', loreId, 'Detected ephemeral from LLM');
            } catch (err) {
                console.error("Error inserting ephemeral place:", err);
            }
        }
    }

    // Insert quests
    if (data.quests?.length) {
        for (const q of data.quests) {
            try {
                const loreId = await getOrCreateLoreQuest(q.title, q.description);
                await addEphemeralEntity(chatId, 'quest', loreId, 'Detected ephemeral from LLM');
            } catch (err) {
                console.error("Error inserting ephemeral quest:", err);
            }
        }
    }

    // Insert plot points
    if (data.plot_points?.length) {
        for (const pp of data.plot_points) {
            try {
                await addEphemeralPlotPoint(chatId, pp.notes);
            } catch (err) {
                console.error("Error inserting ephemeral plot point:", err);
            }
        }
    }
}

// ------------------------------
// Fetch messages since the last session_history entry
// ------------------------------
async function getMessagesSinceLastHistory(chatId: string): Promise<{ role: string; content: string; created_at: string }[]> {
    try {
        // Get the latest history timestamp
        const { data: historyRows, error: historyError } = await supabase
            .from('session_history')
            .select('created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (historyError) {
            console.error('Error fetching last session_history:', historyError);
            return [];
        }

        const lastHistoryTime = historyRows?.[0]?.created_at || null;

        // Fetch messages after last history timestamp
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .gt(lastHistoryTime ? 'created_at' : 'id', lastHistoryTime ?? '0'); // fallback if no lastHistoryTime

        if (messagesError) {
            console.error('Error fetching messages since last history:', messagesError);
            return [];
        }

        return messages ?? [];
    } catch (err) {
        console.error('Unexpected error in getMessagesSinceLastHistory:', err);
        return [];
    }
}

// ------------------------------
// Summarize session history using LLM
// ------------------------------
async function summarizeSessionHistory(
    chatId: string,
    messagesSinceLastHistory: { role: string; content: string; created_at: string }[]
) {
    if (!messagesSinceLastHistory || messagesSinceLastHistory.length === 0) return;

    // Build a text block for the LLM
    const conversationText = messagesSinceLastHistory
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const systemPrompt = `
You are a Game Master assistant.
Summarize the adventure so far in a concise story summary.
Output JSON only:
{
  "summary": "..."
}
`;

    try {
        const completion = await client.chat.completions.create({
            model: 'deepseek-ai/deepseek-r1',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: conversationText }
            ],
            temperature: 0,
            max_tokens: 512
        });

        const reply = completion.choices[0].message.content ?? '';
        const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : reply;

        const parsed = JSON.parse(jsonString);

        if (parsed?.summary) {
            // Insert the new summary into session_history
            await addHistoryEvent(chatId, parsed.summary);
            console.log(`Session summary added for chat ${chatId}`);
        }
    } catch (err) {
        console.error('Error summarizing session history:', err);
    }
}

// ------------------------------
// POST handler
// ------------------------------
export async function POST({ request }) {
    console.log("Received request to /api/chat/regenerate");
    const { chatId, messages } = await request.json();

    if (!chatId || !Array.isArray(messages)) {
        return json({ error: "Missing chatId or invalid messages" }, { status: 400 });
    }

    try {
        // Save latest user message
        const userMessage = messages[messages.length - 1];
        console.log("Latest user message:", userMessage);

        if (userMessage.role === "user") {
            await saveMessage(chatId, "user", userMessage.content);

            // ------------------------------
            // Only after a user message:
            // Extract ephemeral entities from recent messages
            // ------------------------------
            const recentMessages = await getMessagesSinceLastUser(chatId); // include user + AI
            console.log("Recent messages for ephemeral extraction:", recentMessages);
            const ephemeralData = await extractEphemeralEntitiesLLM(recentMessages);
            await insertEphemeralData(chatId, ephemeralData);

            // ------------------------------
            // Check if we should summarize
            // ------------------------------
            const messagesSinceLastHistory = await getMessagesSinceLastHistory(chatId);
            if (messagesSinceLastHistory.length >= SUMMARY_THRESHOLD) {
                console.log(`Generating session summary for ${messagesSinceLastHistory.length} messages`);
                await summarizeSessionHistory(chatId, messagesSinceLastHistory);
            }
        }

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
