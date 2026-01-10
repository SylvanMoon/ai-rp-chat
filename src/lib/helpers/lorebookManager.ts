import { supabase } from '$lib/client/supabaseClient';

// ------------------------------
// Get session lore snapshot
// ------------------------------
export async function getSessionLoreSnapshot(chatId: string) {
    // --------------------------
    // Fetch characters, places, plot points
    // --------------------------
    const [
        { data: characters = [], error: charErr },
        { data: places = [], error: placeErr },
        { data: plot_points = [], error: plotErr },
        { data: lorebookData = [] } = { data: [] },
    ] = await Promise.all([
        supabase
            .from('session_characters')
            .select('id, character_id, name, description, state, reinforcement_count, last_mentioned, last_mentioned_turn'),
        supabase
            .from('session_places')
            .select('id, place_id, name, description, state, reinforcement_count, last_mentioned, last_mentioned_turn'),
        supabase
            .from('session_plot_points')
            .select('id, title, description, state, reinforcement_count, importance, last_mentioned, last_mentioned_turn'),
        supabase
            .from('lorebooks')
            .select('*')
            .eq('chat_id', chatId)
            .single(),
        supabase
            .from('session_history')
            .select('id, timestamp, summary, notes')
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: true })
    ]);

    if (charErr || placeErr || plotErr) {
        console.error('Failed to fetch session data', { charErr, placeErr, plotErr });
    }

    // --------------------------
    // Mark ephemeral for new entities (state === candidate)
    // --------------------------
    const markEphemeral = (items: any[]) => items.map(i => ({ ...i, ephemeral: i.state === 'candidate' }));

    return {
        lorebook: lorebookData ?? null,
        characters: markEphemeral(characters || []),
        places: markEphemeral(places || []),
        plot_points: markEphemeral(plot_points || []),
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
// Build system prompt
// ------------------------------
export async function buildSystemPrompt(basePrompt: string, sessionData: any, chatId: string, lorebookData: any = null) {
    let prompt = basePrompt.trim() + '\n\n';
    const { lorebook, characters, places, plot_points } = sessionData;

    if (lorebook) prompt += `Setting: ${lorebook.name}\n\n`;

    if (characters?.length) {
        prompt += 'KNOWN CHARACTERS:\n';
        characters.forEach((c: any) => {
            prompt += `- ${c.name}: ${c.description}\n`;
            if (c.relationships) prompt += `  Relationships: ${JSON.stringify(c.relationships)}\n`;
            if (c.notes) prompt += `  Notes: ${c.notes}\n`;
        });
        prompt += '\n';
    }

    if (places?.length) {
        prompt += 'KNOWN PLACES:\n';
        places.forEach((p: any) => {
            prompt += `- ${p.name}: ${p.description}\n`;
            if (p.notes) prompt += `  Notes: ${p.notes}\n`;
        });
        prompt += '\n';
    }

    if (plot_points?.length) {
        prompt += 'CURRENT PLOT POINTS:\n';
        plot_points.forEach((p: any) => {
            prompt += `- ${p.notes} (Status: ${p.status ?? 'active'})${p.ephemeral ? ' [ephemeral]' : ''}\n`;
        });
        prompt += '\n';
    }

    // Optional fallback to lorebook if session is empty
    if ((!characters?.length && !places?.length) && lorebookData) {
        prompt += `You may reference this lorebook if needed: "${lorebookData.lorebook.name}"\n`;
        prompt += `${lorebookData.lorebook.description}\n`;
    }

    // Fetch the main_prompt for this chat
    const { data: chat } = await supabase
        .from('chats')
        .select('main_prompt')
        .eq('id', chatId)
        .single();
    const mainPrompt = chat?.main_prompt || 'You are a roleplaying game narrator. Stay in character and describe scenes vividly.';

    prompt += mainPrompt;

    return prompt;
}