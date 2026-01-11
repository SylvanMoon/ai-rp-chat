import { supabase } from '$lib/client/supabaseClient';

// ------------------------------
// Get session lore snapshot (SESSION-ONLY, ACTIVE + CANDIDATE)
// ------------------------------
export async function getSessionLoreSnapshot(chatId: string) {
    const [
        { data: characters = [], error: charErr },
        { data: places = [], error: placeErr },
        { data: plotPoints = [], error: plotErr }
    ] = await Promise.all([
        supabase
            .from('session_characters')
            .select('id, character_id, name, description, state')
            .eq('chat_id', chatId)
            .in('state', ['active', 'candidate']),

        supabase
            .from('session_places')
            .select('id, place_id, name, description, state')
            .eq('chat_id', chatId)
            .in('state', ['active', 'candidate']),

        supabase
            .from('session_plot_points')
            .select('id, title, description, state')
            .eq('chat_id', chatId)
            .in('state', ['active', 'candidate'])
    ]);

    if (charErr || placeErr || plotErr) {
        console.error('Failed to fetch session lore snapshot', {
            charErr,
            placeErr,
            plotErr
        });
    }

    return {
        characters: characters ?? [],
        places: places ?? [],
        plot_points: plotPoints ?? []
    };
}

// ------------------------------
// Get lorebook data
// ------------------------------
export async function getLorebookData(chatId: string) {
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
// Build system prompt (SESSION ONLY)
// ------------------------------
export async function buildSystemPrompt(
    basePrompt: string,
    sessionData: any,
    chatId: string
) {
    let prompt = basePrompt.trim() + '\n\n';

    const { characters, places, plot_points } = sessionData;

    // ---------------- Characters ----------------
    if (characters?.length) {
        prompt += 'KNOWN CHARACTERS:\n';
        characters.forEach((c: any) => {
            prompt += `- ${c.name}: ${c.description ?? 'No description.'}\n`;
            if (c.notes) prompt += `  Notes: ${c.notes}\n`;
        });
        prompt += '\n';
    }

    // ---------------- Places ----------------
    if (places?.length) {
        prompt += 'KNOWN PLACES:\n';
        places.forEach((p: any) => {
            prompt += `- ${p.name}: ${p.description ?? 'No description.'}\n`;
            if (p.notes) prompt += `  Notes: ${p.notes}\n`;
        });
        prompt += '\n';
    }

    // ---------------- Plot Points ----------------
    if (plot_points?.length) {
        prompt += 'CURRENT PLOT POINTS:\n';
        plot_points.forEach((p: any) => {
            prompt += `- ${p.title}`;
            if (p.description) prompt += `: ${p.description}`;
            prompt += ` (State: ${p.state})\n`;
        });
        prompt += '\n';
    }

    // ---------------- Main Prompt ----------------
    const { data: chat } = await supabase
        .from('chats')
        .select('main_prompt')
        .eq('id', chatId)
        .single();

    const mainPrompt =
        chat?.main_prompt ||
        'You are a roleplaying game narrator. Stay in character and describe scenes vividly.';

    prompt += mainPrompt;

    return prompt;
}