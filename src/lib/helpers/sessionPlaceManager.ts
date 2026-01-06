import { supabase } from '$lib/client/supabaseClient';

export async function getSessionPlace(chatId: string, name: string) {
  const { data, error } = await supabase
    .from("session_places")
    .select("*")
    .eq("chat_id", chatId)
    .ilike("notes", `%${name}%`)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

export async function addSessionPlace(
  chatId: string,
  payload: {
    notes?: string;
    state: "candidate" | "active" | "inactive" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
    introduced_at: Date;
  }
) {
  const { error } = await supabase
    .from("session_places")
    .insert({
      chat_id: chatId,
      notes: payload.notes ?? null,
      state: payload.state,
      importance: payload.importance,
      reinforcement_count: payload.reinforcement_count,
      last_mentioned_at: payload.last_mentioned_at,
      introduced_at: payload.introduced_at,
      created_at: payload.introduced_at,
      updated_at: payload.last_mentioned_at
    });

  if (error) throw error;
}

export async function updateSessionPlace(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "inactive" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
  }>
) {
  const { error } = await supabase
    .from("session_places")
    .update({
      ...updates,
      updated_at: new Date()
    })
    .eq("id", id);

  if (error) throw error;
}
