import { supabase } from '$lib/client/supabaseClient';

export async function addSessionCharacter(
  chatId: string,
  payload: {
    character_id?: string | null;
    notes?: string;
    state: "candidate" | "active" | "inactive" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
    introduced_at: Date;
  }
) {
  const { error } = await supabase
    .from("session_characters")
    .insert({
      chat_id: chatId,
      character_id: payload.character_id ?? null,
      notes: payload.notes ?? null,
      state: payload.state,
      importance: payload.importance,
      reinforcement_count: payload.reinforcement_count,
      last_mentioned: payload.last_mentioned_at,
      created_at: payload.introduced_at,
      updated_at: payload.last_mentioned_at
    });

  if (error) throw error;
}

export async function updateSessionCharacter(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "inactive" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
  }>
) {
  const { error } = await supabase
    .from("session_characters")
    .update({
      ...updates,
      updated_at: new Date()
    })
    .eq("id", id);

  if (error) throw error;
}

export async function getSessionCharacter(
  chatId: string,
  name: string,
  characterId?: string
) {
  let query = supabase
    .from("session_characters")
    .select("*")
    .eq("chat_id", chatId)
    .limit(1);

  if (characterId) {
    query = query.eq("character_id", characterId);
  } else {
    query = query.ilike("notes", `%${name}%`);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}


