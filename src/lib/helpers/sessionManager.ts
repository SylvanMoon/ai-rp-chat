import { client } from "$lib/server/openaiClient";
import type { SessionCharacter } from "./sessionCharacterManager";
import type { SessionPlace } from "./sessionPlaceManager";
import type { SessionPlotPoint } from "./sessionPlotPointsManager";

interface SessionQuest {
    id: string;
    title: string;
    description: string;
    status?: string;
    notes?: string;
    ephemeral?: boolean;
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
// Summarize session history using LLM
// ------------------------------
export async function summarizeSessionHistory(
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
            // await addHistoryEvent(chatId, parsed.summary);
            console.log(`Session summary added for chat ${chatId}`);
        }
    } catch (err) {
        console.error('Error summarizing session history:', err);
    }
}