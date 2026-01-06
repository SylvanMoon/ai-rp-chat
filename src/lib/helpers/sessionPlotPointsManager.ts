import { supabase } from '$lib/client/supabaseClient';

export async function getSessionPlotPoint(chatId: string, notes: string) {
  const { data, error } = await supabase
    .from("session_plot_points")
    .select("*")
    .eq("chat_id", chatId)
    .ilike("notes", `%${notes.slice(0, 40)}%`)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

export async function addSessionPlotPoint(
  chatId: string,
  payload: {
    notes: string;
    state: "candidate" | "active" | "fading" | "resolved" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
    introduced_at: Date;
  }
) {
  const { error } = await supabase
    .from("session_plot_points")
    .insert({
      chat_id: chatId,
      notes: payload.notes,
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

export async function updateSessionPlotPoint(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "fading" | "resolved" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned_at: Date;
  }>
) {
  const { error } = await supabase
    .from("session_plot_points")
    .update({
      ...updates,
      updated_at: new Date()
    })
    .eq("id", id);

  if (error) throw error;
}

