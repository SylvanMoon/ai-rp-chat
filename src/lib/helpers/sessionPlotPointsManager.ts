import { supabase } from '$lib/client/supabaseClient';

export interface SessionPlotPoint {
  id: string;
  chat_id: string;
  title: string;
  description?: string | null;
  state: "candidate" | "active" | "fading" | "archived";
  importance: number;
  reinforcement_count: number;
  last_mentioned: string;
  last_mentioned_turn: number | null;
}

//---------------------------------
// Add Session Plot Point
//---------------------------------

export async function addSessionPlotPoint(
  chatId: string,
  payload: {
    title: string;
    description?: string;
    state?: "candidate" | "active" | "fading" | "archived";
    importance?: number;
    reinforcement_count?: number;
    last_mentioned?: Date;
    last_mentioned_turn?: number;
  }
) {
  const { error } = await supabase
    .from("session_plot_points")
    .insert({
      chat_id: chatId,
      title: payload.title,
      description: payload.description ?? null,
      state: payload.state ?? "candidate",
      importance: payload.importance ?? 1,
      reinforcement_count: payload.reinforcement_count ?? 1,
      last_mentioned: payload.last_mentioned ?? new Date(),
      last_mentioned_turn: payload.last_mentioned_turn ?? null
    });

  if (error) throw error;
}

//---------------------------------
// Update Session Plot Point
//---------------------------------

export async function updateSessionPlotPoint(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "fading" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned: Date;
    last_mentioned_turn: number;
    description: string;
  }>
) {
  const updatePayload: any = { ...updates };

  // Only touch timestamps if something actually changed
  if (!updates.last_mentioned) {
    updatePayload.last_mentioned = new Date();
  }

  const { error } = await supabase
    .from("session_plot_points")
    .update(updatePayload)
    .eq("id", id);

  if (error) throw error;
}

//---------------------------------
// Get Session Plot Point by Title
//---------------------------------

export async function getSessionPlotPoint(
  chatId: string,
  title: string
) {
  const { data, error } = await supabase
    .from("session_plot_points")
    .select("*")
    .eq("chat_id", chatId)
    .ilike("title", title)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data as SessionPlotPoint | null;
}
