<script lang="ts">
	import {
		newAdventure,
		listChats,
		saveChat,
		duplicateChat
	} from '$lib/helpers/chatManager';
	import { goto } from '$app/navigation';
	import type { Message } from '$lib/helpers/messageManager';

	interface Props {
		sidebarOpen: boolean;
		loading: boolean;
		chatId: string | null;
		messages: Message[];
		showLoadChats: boolean;
		chats: any[];
		onChatIdChange: (id: string | null) => void;
		onMessagesChange: (msgs: Message[]) => void;
		onShowLoadChatsChange: (show: boolean) => void;
		onChatsChange: (chats: any[]) => void;
	}

	let {
		sidebarOpen,
		loading,
		chatId,
		messages,
		onChatIdChange,
		onMessagesChange,
		onShowLoadChatsChange,
		onChatsChange
	}: Props = $props();
</script>

<aside class="bg-gray-800 border-r border-gray-700 transition-all duration-300 {sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden">
	<div class="p-4 {sidebarOpen ? 'block' : 'hidden'}">
		<h2 class="text-xl font-bold mb-4">Menu</h2>
		<div class="space-y-2">
			<button
				onclick={() => goto('/lorebook')}
				class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
			>
				Manage Lorebooks
			</button>
			<button
				onclick={() => goto('/mainPrompt')}
				class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
			>
				Main Prompt
			</button>
			<button
				onclick={() => goto('/session')}
				class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
			>
				Session Data
			</button>
			<button
				onclick={() =>
					newAdventure(
						(id) => onChatIdChange(id),
						(msgs) => onMessagesChange(msgs)
					)}
				disabled={loading}
				class="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
			>
				New Adventure
			</button>
			<button
				onclick={() => {
					const name = prompt('Enter chat name:');
					if (name && chatId) {
						saveChat(chatId, name);
					}
				}}
				disabled={!chatId}
				class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
			>
				Save Chat
			</button>
			<button
				onclick={() => {
					const name = prompt('Enter name for duplicated chat:');
					if (name && chatId) {
						duplicateChat(chatId, messages, name, (id) => onChatIdChange(id));
					}
				}}
				disabled={!chatId || loading}
				class="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
			>
				Duplicate Chat
			</button>
			<button
				onclick={async () => {
					const loadedChats = await listChats();
					onChatsChange(loadedChats);
					onShowLoadChatsChange(true);
				}}
				class="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
			>
				Load Chats
			</button>
		</div>
	</div>
</aside>