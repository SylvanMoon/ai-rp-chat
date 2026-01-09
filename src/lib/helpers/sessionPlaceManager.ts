import { supabase } from '$lib/client/supabaseClient';

export interface SessionPlace {
  id: string;
  chat_id: string;
  place_id?: string | null;
  name: string;
  description?: string | null;
  state: "candidate" | "active" | "inactive" | "archived";
  importance: number;
  reinforcement_count: number;
  last_mentioned: string; // timestamptz
}

//---------------------------------
// Add Session Place
//---------------------------------

export async function addSessionPlace(
  chatId: string,
  payload: {
    name: string;
    description?: string | null;
    place_id?: string | null;
    state?: "candidate" | "active" | "inactive" | "archived";
    importance?: number;
    reinforcement_count?: number;
    last_mentioned: Date;
  }
) {
  const { error } = await supabase
    .from("session_places")
    .insert({
      chat_id: chatId,
      name: payload.name,
      description: payload.description ?? null,
      place_id: payload.place_id ?? null,
      state: payload.state ?? "candidate",
      importance: payload.importance ?? 1,
      reinforcement_count: payload.reinforcement_count ?? 1,
      last_mentioned: payload.last_mentioned
    });

  if (error) throw error;
}
//---------------------------------
// Update Session Place
//---------------------------------

export async function updateSessionPlace(
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

  if (Object.keys(updatePayload).length === 0) return;

  const { error } = await supabase
    .from("session_places")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
}

//---------------------------------
// Get Session Place by name
//---------------------------------

export async function getSessionPlace(
  chatId: string,
  name: string,
  placeId?: string
) {
  let query = supabase
    .from("session_places")
    .select("*")
    .eq("chat_id", chatId)
    .limit(1);

  if (placeId) {
    query = query.eq("place_id", placeId);
  } else {
    query = query.ilike("name", name);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

