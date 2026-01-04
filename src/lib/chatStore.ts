import { supabase } from '$lib/supabaseClient';

export type Message = {
	id?: number;
	role: 'system' | 'user' | 'assistant';
	content: string;
};

// Create a new chat session
export async function newAdventure(setChatId: (id: string | null) => void, setMessages: (messages: Message[]) => void) {
	const { data, error } = await supabase
		.from('chats')
		.insert([{ name: 'New Adventure' }])
		.select()
		.single();

	if (!error && data?.id) {
		setChatId(data.id);
		localStorage.setItem('chatId', data.id);
	}

	setMessages([
		{
			role: 'system',
			content:
				'You are a roleplaying game narrator. Stay in character and describe scenes vividly.'
		}
	]);
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
		...data.map((msg) => ({
			id: msg.id,
			role: msg.role as 'user' | 'assistant',
			content: msg.content
		}))
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

		setMessages([...newMessages, { role: 'assistant' as const, content: data.reply }]);
	} catch (err) {
		console.error(err);
		setMessages([...newMessages, { role: 'assistant' as const, content: '⚠️ Error talking to AI.' }]);
	} finally {
		setLoading(false);
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