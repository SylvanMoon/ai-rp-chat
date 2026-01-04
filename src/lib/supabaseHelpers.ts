import { supabase } from "$lib/supabaseClient";

export async function loadMessages(chatId: string) {
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
}

export async function saveMessage(chatId: string, role: string, content: string) {
    const { data, error } = await supabase
        .from("messages")
        .insert([{ chat_id: chatId, role, content }]);

    if (error) throw error;
    return data;
}

export async function createChat(name: string) {
    const { data, error } = await supabase
        .from("chats")
        .insert([{ name }])
        .select()
        .single();

    if (error) throw error;
    return data;
}
