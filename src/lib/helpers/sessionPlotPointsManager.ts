import { supabase } from '$lib/client/supabaseClient';

export interface SessionPlotPoint {
  id: string;
  chat_id: string;
  title: string;
  description?: string | null;
  state: "candidate" | "active" | "inactive" | "fading" | "archived";
  importance: number;
  reinforcement_count: number;
  last_mentioned: string;
}

//---------------------------------
// Add Session Plot Point
//---------------------------------

export async function addSessionPlotPoint(
  chatId: string,
  payload: {
    title: string;
    description?: string;
    state?: "candidate" | "active" | "inactive" | "fading" | "archived";
    importance?: number;
    reinforcement_count?: number;
    last_mentioned?: Date;
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
      last_mentioned: payload.last_mentioned ?? new Date()
    });

  if (error) throw error;
}

//---------------------------------
// Update Session Plot Point
//---------------------------------

export async function updateSessionPlotPoint(
  id: string,
  updates: Partial<{
    state: "candidate" | "active" | "inactive" | "fading" | "archived";
    importance: number;
    reinforcement_count: number;
    last_mentioned: Date;
    description: string;
  }>
) {
  const { error } = await supabase
    .from("session_plot_points")
    .update({
      ...updates,
      last_mentioned: updates.last_mentioned ?? new Date()
    })
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

