import { supabase } from '$lib/client/supabaseClient';
import { defaultMainPrompt } from '$lib/constants/mainPrompt';
import { loadMessages, type Message } from './messageManager';

//---------------------------------
// List all chats
//---------------------------------
export async function listChats() {
	const { data, error } = await supabase
		.from('chats')
		.select('id, name, created_at, lorebook_id')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error listing chats:', error);
		return [];
	}

	return data || [];
}

//---------------------------------
// Associate a lorebook with a chat
//---------------------------------
export async function setChatLorebook(chatId: string, lorebookId: string | null) {
	const { error } = await supabase
		.from('chats')
		.update({ lorebook_id: lorebookId })
		.eq('id', chatId);

	if (error) {
		console.error('Error setting chat lorebook:', error);
		return false;
	}

	return true;
}

//---------------------------------
// Get lorebook data for a chat
//---------------------------------
export async function getChatLorebook(chatId: string) {
	// First get the lorebook_id from the chat
	const { data: chat, error: chatError } = await supabase
		.from('chats')
		.select('lorebook_id')
		.eq('id', chatId)
		.single();

	if (chatError || !chat?.lorebook_id) {
		return null;
	}

	// Then get the lorebook data
	const { data: lorebook, error: lorebookError } = await supabase
		.from('lorebooks')
		.select('*')
		.eq('id', chat.lorebook_id)
		.single();

	if (lorebookError) {
		console.error('Error loading lorebook:', lorebookError);
		return null;
	}

	// Get characters, places, and quests
	const [charactersRes, placesRes, questsRes] = await Promise.all([
		supabase.from('lore_characters').select('*').eq('lorebook_id', chat.lorebook_id),
		supabase.from('lore_places').select('*').eq('lorebook_id', chat.lorebook_id),
		supabase.from('lore_quests').select('*').eq('lorebook_id', chat.lorebook_id)
	]);

	return {
		lorebook,
		characters: charactersRes.data || [],
		places: placesRes.data || [],
		quests: questsRes.data || []
	};
}

//---------------------------------
// Save/update chat name
//---------------------------------
export async function saveChat(chatId: string, name: string) {
	const { error } = await supabase
		.from('chats')
		.update({ name })
		.eq('id', chatId);

	if (error) {
		console.error('Error saving chat:', error);
	}
}

//---------------------------------
// Delete a chat and its messages
//---------------------------------
export async function deleteChat(chatId: string) {
	// First delete messages
	const { error: messagesError } = await supabase
		.from('messages')
		.delete()
		.eq('chat_id', chatId);

	if (messagesError) {
		console.error('Error deleting messages:', messagesError);
		return false;
	}

	// Then delete chat
	const { error: chatError } = await supabase
		.from('chats')
		.delete()
		.eq('id', chatId);

	if (chatError) {
		console.error('Error deleting chat:', chatError);
		return false;
	}

	return true;
}

//---------------------------------
// Duplicate a chat (create a copy)
//---------------------------------
export async function duplicateChat(chatId: string | null, messages: Message[], name: string, setChatId: (id: string | null) => void) {
	if (!chatId) return;

	// Get the original chat's lorebook_id
	const { data: originalChat } = await supabase
		.from('chats')
		.select('lorebook_id')
		.eq('id', chatId)
		.single();

	// Create new chat
	const { data: newChat, error: chatError } = await supabase
		.from('chats')
		.insert([{ name, lorebook_id: originalChat?.lorebook_id || null }])
		.select()
		.single();

	if (chatError || !newChat?.id) {
		console.error('Error creating duplicated chat:', chatError);
		return;
	}

	// Copy messages to new chat (excluding system message)
	const messagesToCopy = messages.slice(1).map(msg => ({
		chat_id: newChat.id,
		role: msg.role,
		content: msg.content
	}));

	if (messagesToCopy.length > 0) {
		const { error: messagesError } = await supabase
			.from('messages')
			.insert(messagesToCopy);

		if (messagesError) {
			console.error('Error copying messages:', messagesError);
			// Clean up the chat if messages failed
			await supabase.from('chats').delete().eq('id', newChat.id);
			return;
		}
	}

	// Switch to the new chat
	setChatId(newChat.id);
	localStorage.setItem('chatId', newChat.id);
}

//---------------------------------
// Create a new chat session
//---------------------------------
export async function newAdventure(
	setChatId: (id: string | null) => void,
	setMessages: (messages: Message[]) => void
) {
	// Default main prompt
	const defaultPrompt = defaultMainPrompt

	// Fetch the current main prompt from existing chats
	const { data: existing } = await supabase
		.from('chats')
		.select('main_prompt')
		.limit(1);
	const mainPrompt = existing && existing.length > 0 ? existing[0].main_prompt : defaultPrompt;

	// Create a new chat with optional main_prompt
	const { data, error } = await supabase
		.from('chats')
		.insert([
			{
				name: 'New Adventure',
				main_prompt: mainPrompt
			}
		])
		.select('id, main_prompt')
		.single();

	if (!error && data?.id) {
		setChatId(data.id);
		localStorage.setItem('chatId', data.id);

		// Use main_prompt from the new chat for the system message
		setMessages([
			{
				role: 'system',
				content: data.main_prompt || defaultPrompt
			}
		]);
	} else {
		console.error('Error creating new adventure:', error);
		setMessages([
			{
				role: 'system',
				content: defaultPrompt
			}
		]);
	}
}

//---------------------------------
// Initialize the chat
//---------------------------------
export async function initializeChat(setChatId: (id: string | null) => void, setMessages: (messages: Message[]) => void) {
	const storedChatId = localStorage.getItem('chatId');

	if (storedChatId) {
		setChatId(storedChatId);
		await loadMessages(storedChatId, setMessages);
	} else {
		await newAdventure(setChatId, setMessages);
	}
}