import { supabase } from '$lib/supabaseClient';

export type Message = {
	id?: number;
	role: 'system' | 'user' | 'assistant';
	content: string;
	variants?: string[]; // for assistant messages that can be regenerated
	selectedVariant?: number; // index of selected variant
};

// List all chats
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

// Associate a lorebook with a chat
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

// Get lorebook data for a chat
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

// Save/update chat name
export async function saveChat(chatId: string, name: string) {
	const { error } = await supabase
		.from('chats')
		.update({ name })
		.eq('id', chatId);

	if (error) {
		console.error('Error saving chat:', error);
	}
}

// Delete a chat and its messages
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

// Duplicate a chat (create a copy)
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

// Create a new chat session
export async function newAdventure(
	setChatId: (id: string | null) => void,
	setMessages: (messages: Message[]) => void
) {
	// Default main prompt
	const defaultPrompt =
		'You are a roleplaying game narrator. Stay in character and describe scenes vividly.';

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

// Load existing messages for a chat
export async function loadMessages(chatId: string | null, setMessages: (messages: Message[]) => void) {
	if (!chatId) return;
	const { data, error } = await supabase
		.from('messages')
		.select('*')
		.eq('chat_id', chatId)
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Error loading messages:', error);
		return;
	}

	setMessages([
		{
			role: 'system',
			content:
				'You are a roleplaying game narrator. Stay in character and describe scenes vividly.'
		},
		...data.map((msg) => {
			const message: Message = {
				id: msg.id,
				role: msg.role as 'user' | 'assistant',
				content: msg.content
			};
			if (msg.role === 'assistant') {
				message.variants = [msg.content];
				message.selectedVariant = 0;
			}
			return message;
		})
	]);
}

// Delete a message
export async function deleteMessage(index: number, messages: Message[], setMessages: (messages: Message[]) => void) {
	const msg = messages[index];
	if (msg.id) {
		const { error } = await supabase
			.from('messages')
			.delete()
			.eq('id', msg.id);
		if (error) console.error('Error deleting message:', error);
	}
	const newMessages = [...messages];
	newMessages.splice(index, 1);
	setMessages(newMessages);
}

// Start editing a message
export function startEdit(index: number, setEditingIndex: (index: number | null) => void) {
	setEditingIndex(index);
}

// Save edited message
export async function saveEdit(index: number, newContent: string, messages: Message[], setMessages: (messages: Message[]) => void, setEditingIndex: (index: number | null) => void) {
	const msg = messages[index];
	msg.content = newContent;
	if (msg.id) {
		const { error } = await supabase
			.from('messages')
			.update({ content: newContent })
			.eq('id', msg.id);
		if (error) console.error('Error updating message:', error);
	}
	setEditingIndex(null);
	setMessages([...messages]);
}

// Send message to AI and save both user & AI messages
export async function sendMessage(input: string, chatId: string | null, messages: Message[], setInput: (input: string) => void, setLoading: (loading: boolean) => void, setMessages: (messages: Message[]) => void) {
	if (!input.trim() || !chatId) return;

	const userMessage = input;
	const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
	setMessages(newMessages);
	setInput('');
	setLoading(true);

	try {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chatId, messages: newMessages })
		});

		const data = await res.json();

		setMessages([...newMessages, { role: 'assistant' as const, content: data.reply, variants: [data.reply], selectedVariant: 0 }]);
	} catch (err) {
		console.error(err);
		setMessages([...newMessages, { role: 'assistant' as const, content: '⚠️ Error talking to AI.', variants: ['⚠️ Error talking to AI.'], selectedVariant: 0 }]);
	} finally {
		setLoading(false);
	}
}

// Regenerate an assistant message by adding a new variant
export async function regenerateMessage(index: number, chatId: string | null, messages: Message[], setLoading: (loading: boolean) => void, setMessages: (messages: Message[]) => void) {
	setLoading(true);

	try {
		// Get messages up to the user message before the assistant message
		const messagesUpToUser = messages.slice(0, index);
		
		const res = await fetch('/api/chat/regenerate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chatId, messages: messagesUpToUser })
		});

		const data = await res.json();
		const newVariant = data.option || '⚠️ Error regenerating message.';
		
		const newMessages = [...messages];
		const msg = newMessages[index];
		if (!msg.variants) msg.variants = [msg.content];
		msg.variants.push(newVariant);
		msg.selectedVariant = msg.variants.length - 1;
		msg.content = newVariant;
		
		setMessages(newMessages);
	} catch (err) {
		console.error(err);
		const newMessages = [...messages];
		const msg = newMessages[index];
		if (!msg.variants) msg.variants = [msg.content];
		msg.variants.push('⚠️ Error regenerating message.');
		msg.selectedVariant = msg.variants.length - 1;
		msg.content = '⚠️ Error regenerating message.';
		setMessages(newMessages);
	} finally {
		setLoading(false);
	}
}

// Select a variant for a regeneratable message
export async function selectVariant(index: number, variantIndex: number, messages: Message[], setMessages: (messages: Message[]) => void) {
	const newMessages = [...messages];
	const msg = newMessages[index];
	if (msg.variants && variantIndex >= 0 && variantIndex < msg.variants.length) {
		msg.selectedVariant = variantIndex;
		msg.content = msg.variants[variantIndex];
		if (msg.id) {
			const { error } = await supabase
				.from('messages')
				.update({ content: msg.content })
				.eq('id', msg.id);
			if (error) console.error('Error updating message:', error);
		}
		setMessages(newMessages);
	}
}

// Initialize the chat
export async function initializeChat(setChatId: (id: string | null) => void, setMessages: (messages: Message[]) => void) {
	const storedChatId = localStorage.getItem('chatId');

	if (storedChatId) {
		setChatId(storedChatId);
		await loadMessages(storedChatId, setMessages);
	} else {
		await newAdventure(setChatId, setMessages);
	}
}