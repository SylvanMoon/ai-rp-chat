import { writable } from 'svelte/store';
import {
	newAdventure,
	listChats,
	saveChat,
	deleteChat,
	duplicateChat,
} from '../../../../lib/helpers/chatManager';
import { goto } from '$app/navigation';
import { loadMessages, type Message } from '$lib/helpers/messageManager';

export function createSidebarStore() {
	const sidebarOpen = writable(false);
	const showLoadChats = writable(false);
	const chats = writable<any[]>([]);

	return {
		sidebarOpen,
		showLoadChats,
		chats,

		toggleSidebar() {
			sidebarOpen.update(open => !open);
		},

		goToLorebook() {
			goto('/lorebook');
		},

		async newAdventure(onChatIdChange: (id: string | null) => void, onMessagesChange: (msgs: Message[]) => void) {
			newAdventure(onChatIdChange, onMessagesChange);
		},

		saveChat(chatId: string | null) {
			const name = prompt('Enter chat name:');
			if (name && chatId) {
				saveChat(chatId, name);
			}
		},

		duplicateChat(chatId: string | null, messages: Message[], onChatIdChange: (id: string | null) => void) {
			const name = prompt('Enter name for duplicated chat:');
			if (name && chatId) {
				duplicateChat(chatId, messages, name, onChatIdChange);
			}
		},

		async loadChats() {
			const loadedChats = await listChats();
			chats.set(loadedChats);
			showLoadChats.set(true);
		},

		async selectChat(chatId: string, onChatIdChange: (id: string | null) => void, onMessagesChange: (msgs: Message[]) => void) {
			localStorage.setItem('chatId', chatId);
			await loadMessages(chatId, onMessagesChange);
			showLoadChats.set(false);
			onChatIdChange(chatId);
		},

		async deleteChat(chatId: string, currentChatId: string | null, onChatIdChange: (id: string | null) => void, onMessagesChange: (msgs: Message[]) => void) {
			if (confirm(`Are you sure you want to delete this chat?`)) {
				const success = await deleteChat(chatId);
				if (success) {
					// Reload chats from server to ensure the list is up to date
					const loadedChats = await listChats();
					chats.set(loadedChats);
					if (currentChatId === chatId) {
						onChatIdChange(null);
						onMessagesChange([{
							role: 'system',
							content: 'You are a roleplaying game narrator. Stay in character and describe scenes vividly.'
						}]);
					}
				}
			}
		}
	};
}