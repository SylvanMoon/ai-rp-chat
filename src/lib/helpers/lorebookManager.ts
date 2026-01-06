import { supabase } from '$lib/client/supabaseClient';

// ------------------------------
// Get session lore snapshot
// ------------------------------
export async function getSessionLoreSnapshot(chatId: string) {
    // const [
    //     charactersRes,
    //     placesRes,
    //     questsRes,
    //     plotPointsRes,
    //     historyRes
    // ] = await Promise.all([
    //     supabase.from('session_characters')
    //         .select(`notes, ephemeral, lore_characters(id,name,description,relationships,aliases)`)
    //         .eq('chat_id', chatId),
    //     supabase.from('session_places')
    //         .select(`notes, ephemeral, lore_places(id,name,description)`)
    //         .eq('chat_id', chatId),
    //     supabase.from('session_quests')
    //         .select(`status, notes, ephemeral, lore_quests(id,title,description)`)
    //         .eq('chat_id', chatId),
    //     supabase.from('session_plot_points')
    //         .select(`id, notes, status, ephemeral`)
    //         .eq('chat_id', chatId),
    //     supabase.from('session_history')
    //         .select(`id, timestamp, summary, notes`)
    //         .eq('chat_id', chatId)
    //         .order('timestamp', { ascending: true })
    // ]);

    // return {
    //     characters: charactersRes.data?.map(r => ({
    //         ...(r.lore_characters as any),
    //         notes: r.notes,
    //         ephemeral: r.ephemeral || false
    //     })) ?? [],
    //     places: placesRes.data?.map(r => ({
    //         ...(r.lore_places as any),
    //         notes: r.notes,
    //         ephemeral: r.ephemeral || false
    //     })) ?? [],
    //     quests: questsRes.data?.map(r => ({
    //         ...(r.lore_quests as any),
    //         status: r.status,
    //         notes: r.notes,
    //         ephemeral: r.ephemeral || false
    //     })) ?? [],
    //     plot_points: plotPointsRes.data ?? [],
    //     history: historyRes.data ?? []
    // };

    return {
        lorebook: null,
        characters: [],
        places: [],
        quests: [],
        plot_points: [],
        history: []
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
    const { lorebook, characters, places, quests, plot_points, history } = sessionData;

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

    if (quests?.length) {
        prompt += 'ACTIVE QUESTS:\n';
        quests.forEach((q: any) => {
            prompt += `- ${q.title}: ${q.description} (Status: ${q.status})\n`;
            if (q.notes) prompt += `  Notes: ${q.notes}\n`;
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

    if (history?.length) {
        prompt += 'SESSION HISTORY:\n';
        history.forEach((h: any) => {
            prompt += `- ${new Date(h.timestamp).toISOString()}: ${h.summary}`;
            if (h.notes) prompt += ` (${h.notes})`;
            prompt += '\n';
        });
        prompt += '\n';
    }

    // Optional fallback to lorebook if session is empty
    if ((!characters?.length && !places?.length && !quests?.length) && lorebookData) {
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