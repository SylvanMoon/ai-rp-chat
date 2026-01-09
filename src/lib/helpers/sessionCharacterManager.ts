import { supabase } from '$lib/client/supabaseClient';

export interface SessionCharacter {
  id: string;
  chat_id: string;
  character_id?: string | null;
  name: string;
  description?: string | null;
  state: "candidate" | "active" | "inactive" | "archived";
  importance: number;
  reinforcement_count: number;
  last_mentioned: string; // ISO string from Supabase
}

//---------------------------------
// Add Session Character
//---------------------------------

export async function addSessionCharacter(
  chatId: string,
  payload: {
    name: string;
    description?: string | null;
    character_id?: string | null;
    state?: "candidate" | "active" | "inactive" | "archived";
    importance?: number;
    reinforcement_count?: number;
    last_mentioned: Date;
  }
) {
  const { error } = await supabase
    .from("session_characters")
    .insert({
      chat_id: chatId,
      name: payload.name,
      description: payload.description ?? null,
      character_id: payload.character_id ?? null,
      state: payload.state ?? "candidate",
      importance: payload.importance ?? 1,
      reinforcement_count: payload.reinforcement_count ?? 1,
      last_mentioned: payload.last_mentioned,
    });

  if (error) throw error;
}

//---------------------------------
// Update Session Character
//---------------------------------

export async function updateSessionCharacter(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "inactive" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned: Date;
  }>
) {
  const updatePayload: any = {};

  if (updates.state !== undefined) updatePayload.state = updates.state;
  if (updates.importance !== undefined) updatePayload.importance = updates.importance;
  if (updates.reinforcement_count !== undefined) {
    updatePayload.reinforcement_count = updates.reinforcement_count;
  }
  if (updates.last_mentioned !== undefined) {
    updatePayload.last_mentioned = updates.last_mentioned;
  }

  const { error } = await supabase
    .from("session_characters")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
}

// ---------------------------------
// Get Session Character
// ---------------------------------

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
    query = query.ilike("name", name);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}



