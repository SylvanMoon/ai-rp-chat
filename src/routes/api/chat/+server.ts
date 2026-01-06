import { json } from "@sveltejs/kit";
import { client } from '$lib/server/openaiClient';
import { supabase } from '$lib/client/supabaseClient';
import { addSessionCharacter, getSessionCharacter, updateSessionCharacter } from "$lib/helpers/sessionCharacterManager";
import { addSessionPlace, getSessionPlace, updateSessionPlace } from "$lib/helpers/sessionPlaceManager";
import { addSessionPlotPoint, getSessionPlotPoint, updateSessionPlotPoint } from "$lib/helpers/sessionPlotPointsManager";
import { buildSystemPrompt, getSessionLoreSnapshot } from "$lib/helpers/lorebookManager";
import { runPromotionAndDecay } from "$lib/helpers/runPromotionAndDecay";
import { extractEphemeralEntitiesLLM } from "$lib/helpers/extractEphemeralEntitiesLLM";
import { saveMessage } from "$lib/helpers/messageManager";



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

// // ------------------------------
// // Save a chat message
// // ------------------------------
// async function saveMessage(chatId: string, role: string, content: string) {
//     const { error } = await supabase
//         .from("messages")
//         .insert([{ chat_id: chatId, role, content }]);
//     if (error) console.error("Supabase saveMessage error:", error);
// }



// ------------------------------
// Add ephemeral entity
// ------------------------------
async function addEphemeralEntity(chatId: string, type: 'character' | 'place' | 'quest', entityData: any) {
    const tableMap = { character: 'session_characters', place: 'session_places', quest: 'session_quests' } as const;
    const columnMap = { character: 'character_id', place: 'place_id', quest: 'quest_id' } as const;
    const table = tableMap[type];
    const column = columnMap[type];

    try {
        // Store entity data as JSON in notes field, with null foreign key ID
        const notes = JSON.stringify(entityData);
        const { error: insertError } = await supabase.from(table).insert({
            chat_id: chatId,
            [column]: null,
            notes,
            ephemeral: true
        });
        if (insertError) console.error(`Insert ephemeral ${type} error:`, insertError);
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
// Helper: Insert ephemeral data into session tables
// ------------------------------
// async function insertEphemeralData(chatId: string, data: any) {
//     if (!data) return;

//     // Insert characters
//     if (data.characters?.length) {
//         for (const c of data.characters) {
//             try {
//                 await addEphemeralEntity(chatId, 'character', c);
//             } catch (err) {
//                 console.error("Error inserting ephemeral character:", err);
//             }
//         }
//     }

//     // Insert places
//     if (data.places?.length) {
//         for (const p of data.places) {
//             try {
//                 await addEphemeralEntity(chatId, 'place', p);
//             } catch (err) {
//                 console.error("Error inserting ephemeral place:", err);
//             }
//         }
//     }

//     // Insert quests
//     if (data.quests?.length) {
//         for (const q of data.quests) {
//             try {
//                 await addEphemeralEntity(chatId, 'quest', q);
//             } catch (err) {
//                 console.error("Error inserting ephemeral quest:", err);
//             }
//         }
//     }

//     // Insert plot points
//     if (data.plot_points?.length) {
//         for (const pp of data.plot_points) {
//             try {
//                 await addEphemeralPlotPoint(chatId, pp.notes);
//             } catch (err) {
//                 console.error("Error inserting ephemeral plot point:", err);
//             }
//         }
//     }
// }

async function insertEphemeralData(chatId: string, data: any) {
    if (!data) return;

    // ---------------- Characters ----------------
    if (data.characters?.length) {
        for (const c of data.characters) {
            try {
                // Check if character already exists in session
                const existing = await getSessionCharacter(chatId, c.name);
                if (existing) {
                    // Reinforce
                    await updateSessionCharacter(existing.id, {
                        reinforcement_count: existing.reinforcement_count + 1,
                        last_mentioned_at: new Date()
                    });
                } else {
                    // Insert as candidate
                    await addSessionCharacter(chatId, {
                        character_id: c.character_id ?? null,
                        notes: c.description ?? '',
                        state: 'candidate',
                        reinforcement_count: 1,
                        importance: 1,
                        last_mentioned_at: new Date(),
                        introduced_at: new Date()
                    });
                }
            } catch (err) {
                console.error("Error inserting character:", err);
            }
        }
    }

    // ---------------- Places ----------------
    if (data.places?.length) {
        for (const p of data.places) {
            try {
                const existing = await getSessionPlace(chatId, p.name);
                if (existing) {
                    await updateSessionPlace(existing.id, {
                        reinforcement_count: existing.reinforcement_count + 1,
                        last_mentioned_at: new Date()
                    });
                } else {
                    await addSessionPlace(chatId, {
                        notes: p.description ?? '',
                        state: 'candidate',
                        reinforcement_count: 1,
                        importance: 1,
                        last_mentioned_at: new Date(),
                        introduced_at: new Date()
                    });
                }
            } catch (err) {
                console.error("Error inserting place:", err);
            }
        }
    }

    // ---------------- Plot Points ----------------
    if (data.plot_points?.length) {
        for (const pp of data.plot_points) {
            try {
                const existing = await getSessionPlotPoint(chatId, pp.notes);
                if (existing) {
                    await updateSessionPlotPoint(existing.id, {
                        reinforcement_count: existing.reinforcement_count + 1,
                        last_mentioned_at: new Date()
                    });
                } else {
                    await addSessionPlotPoint(chatId, {
                        notes: pp.notes,
                        state: 'candidate',
                        reinforcement_count: 1,
                        importance: 1,
                        last_mentioned_at: new Date(),
                        introduced_at: new Date()
                    });
                }
            } catch (err) {
                console.error("Error inserting plot point:", err);
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
        let query = supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (lastHistoryTime) {
            query = query.gt('created_at', lastHistoryTime);
        }

        const { data: messages, error: messagesError } = await query;

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
    const { chatId, messages } = await request.json();

    if (!chatId || !Array.isArray(messages)) {
        return json({ error: "Missing chatId or invalid messages" }, { status: 400 });
    }

    try {
        // Save latest user message
        const userMessage = messages[messages.length - 1];
        console.log("--------------------------------------")
        console.log("Latest user message:", userMessage);

        if (userMessage.role === "user") {
            await saveMessage(chatId, "user", userMessage.content);

            // ------------------------------
            // Only after a user message:
            // Extract ephemeral entities from recent messages
            // ------------------------------
            const recentMessages = await getMessagesSinceLastUser(chatId); // include user + AI
            console.log("--------------------------------------")
            console.log("Recent messages for ephemeral extraction:", recentMessages);
            const ephemeralData = await extractEphemeralEntitiesLLM(recentMessages);
            await insertEphemeralData(chatId, ephemeralData);
            // await runPromotionAndDecay(chatId, assistantTurn)

            // ------------------------------
            // Check if we should summarize
            // ------------------------------
            const messagesSinceLastHistory = await getMessagesSinceLastHistory(chatId);
            if (messagesSinceLastHistory.length >= SUMMARY_THRESHOLD) {
                console.log("--------------------------------------")
                console.log(`Generating session summary for ${messagesSinceLastHistory.length} messages`);
                await summarizeSessionHistory(chatId, messagesSinceLastHistory);
            }
        }

        // Get session snapshot for system prompt
        const sessionLoreData = await getSessionLoreSnapshot(chatId);

        // Build enhanced system prompt
        const enhancedMessages = [...messages];
        if (enhancedMessages[0].role === 'system') {
            enhancedMessages[0].content = await buildSystemPrompt(enhancedMessages[0].content, sessionLoreData, chatId, null);
        }

        // Log the full prompt being sent to LLM
        console.log("--------------------------------------")
        console.log("Full prompt being sent to LLM:", JSON.stringify(enhancedMessages, null, 2));

        // Generate AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: enhancedMessages,
            temperature: 1.8,
            top_p: 0.98,
            max_tokens: 2048,
            frequency_penalty: 0.15,
            presence_penalty: 0.1,
            stop: [
                "\nYou:",
                "\nUser:",
                "\n<USER>:"
            ]
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
