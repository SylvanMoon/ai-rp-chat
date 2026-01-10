<script lang="ts">
	import Markdown from '$lib/Markdown.svelte';
	import { mdiPencil, mdiTrashCan, mdiRefresh, mdiChevronLeft, mdiChevronRight } from '@mdi/js';
	import {
		initializeChat,
		setChatLorebook,
		getChatLorebook
	} from '$lib/helpers/chatManager.';
	import { supabase } from '$lib/client/supabaseClient';
	import { createSidebarStore } from './components/sidebar/sidebar';
	import Sidebar from './components/sidebar/Sidebar.svelte';
	import { deleteMessage, regenerateMessage, saveEdit, selectVariant, sendMessage, startEdit, type Message } from '$lib/helpers/messageManager';
	import { defaultMainPrompt } from '$lib/constants/mainPrompt';

	let input = $state('');
	let loading = $state(false);
	let chatId = $state<string | null>(null);
	let editingIndex = $state<number | null>(null);

	let messages = $state<Message[]>([
		{
			role: 'system',
			content: defaultMainPrompt
		}
	]);

	let lorebooks = $state<any[]>([]);
	let currentChatLorebook = $state<any>(null);
	let selectedLorebookId = $state<string>('');

	const sidebar = createSidebarStore();

	// Reactive store subscriptions
	let sidebarOpen = $state(false);
	let showLoadChats = $state(false);
	let sidebarChats = $state<any[]>([]);

	$effect(() => {
		const unsubscribeOpen = sidebar.sidebarOpen.subscribe(value => sidebarOpen = value);
		const unsubscribeShow = sidebar.showLoadChats.subscribe(value => showLoadChats = value);
		const unsubscribeChats = sidebar.chats.subscribe(value => sidebarChats = value);

		return () => {
			unsubscribeOpen();
			unsubscribeShow();
			unsubscribeChats();
		};
	});

	$effect(() => {
		initializeChat(
			(id) => (chatId = id),
			(msgs) => (messages = msgs)
		);
	});

	// Load lorebooks and current chat lorebook when chatId changes
	$effect(() => {
		if (chatId) {
			loadChatLorebook(chatId);
		}
		loadAvailableLorebooks();
	});

	// Load available lorebooks
	async function loadAvailableLorebooks() {
		const { data, error } = await supabase
			.from('lorebooks')
			.select('id, name, description')
			.order('name');

		if (error) {
			console.error('Error loading lorebooks:', error);
			return;
		}

		lorebooks = data || [];
	}

	// Load the lorebook associated with the current chat
	async function loadChatLorebook(chatId: string) {
		const lorebookData = await getChatLorebook(chatId);
		currentChatLorebook = lorebookData?.lorebook || null;
		selectedLorebookId = currentChatLorebook?.id || '';
	}

	// Set the lorebook for the current chat
	async function selectLorebook(lorebookId: string | null) {
		if (!chatId) return;

		const success = await setChatLorebook(chatId, lorebookId);
		if (success) {
			selectedLorebookId = lorebookId || '';
			if (lorebookId) {
				const selectedLorebook = lorebooks.find(lb => lb.id === lorebookId);
				currentChatLorebook = selectedLorebook || null;
			} else {
				currentChatLorebook = null;
			}
		}
	}

</script>

<main class="flex min-h-screen bg-gray-900 text-white font-sans">
	<!-- Sidebar -->
	<Sidebar
		{sidebarOpen}
		{loading}
		{chatId}
		{messages}
		{showLoadChats}
		chats={sidebarChats}
		onChatIdChange={(id) => chatId = id}
		onMessagesChange={(msgs) => messages = msgs}
		onShowLoadChatsChange={(show) => sidebar.showLoadChats.set(show)}
		onChatsChange={(chs) => sidebar.chats.set(chs)}
	/>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col">
		<!-- Header -->
		<header class="bg-gray-900 p-4 border-b border-gray-700 flex items-center justify-between">
			<div class="flex items-center">
				<button
					onclick={() => sidebar.toggleSidebar()}
					class="mr-4 p-2 bg-gray-700 rounded hover:bg-gray-600 transition"
					aria-label="Toggle sidebar"
				>
					☰
				</button>
				<h1 class="text-2xl font-bold">AI RP Chat</h1>
			</div>

			<!-- Lorebook Selector -->
			{#if chatId}
				<div class="flex items-center gap-2">
					<label for="lorebook-select" class="text-sm font-medium">Lorebook:</label>
					<select
						id="lorebook-select"
						bind:value={selectedLorebookId}
						onchange={(e) => selectLorebook((e.target as HTMLSelectElement).value || null)}
						class="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
					>
						<option value="">No lorebook</option>
						{#each lorebooks as lorebook}
							<option value={lorebook.id}>{lorebook.name}</option>
						{/each}
					</select>
					{#if currentChatLorebook}
						<span class="text-xs text-gray-400 max-w-xs truncate" title={currentChatLorebook.description}>
							{currentChatLorebook.description}
						</span>
					{/if}
				</div>
			{/if}
		</header>

		<!-- Chat Interface -->
		<div class="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full">
			{#if showLoadChats}
				<div class="self-center mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
					<h3 class="text-lg font-bold mb-2">Previous Chats</h3>
					<ul class="space-y-2">
						{#each sidebarChats as chat}
							<li class="flex gap-2">
								<button
									onclick={() => sidebar.selectChat(chat.id, (id) => chatId = id, (msgs) => messages = msgs)}
									class="flex-1 text-left px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
								>
									{chat.name} ({new Date(chat.created_at).toLocaleDateString()})
								</button>
								<button
									onclick={() => sidebar.deleteChat(chat.id, chatId, (id) => chatId = id, (msgs) => messages = msgs)}
									class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
									aria-label="Delete chat"
								>
									🗑️
								</button>
							</li>
						{/each}
					</ul>
					<button
						onclick={() => sidebar.showLoadChats.set(false)}
						class="mt-2 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
					>
						Close
					</button>
				</div>
			{/if}

			<div
				class="chat-container flex-1 overflow-hidden rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col"
			>
				<div class="chat flex-1 overflow-y-auto space-y-3 px-1">
					{#each messages as msg, i}
						{#if msg.role !== 'system'}
							<div
								class="relative max-w-[70%] break-words {msg.role === 'user'
									? 'ml-auto text-right bg-green-600 text-white rounded-bl-xl rounded-tl-xl rounded-tr-xl p-4 flex flex-col gap-2'
									: 'bg-gray-700 text-white rounded-br-xl rounded-tr-xl rounded-tl-xl p-4 flex flex-col gap-2'}"
							>
								{#if editingIndex === i}
									<textarea
										bind:value={msg.content}
										rows="3"
										class="w-full p-2 rounded bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
									></textarea>

									<div class="flex justify-end gap-2">
										<button
											onclick={() =>
												saveEdit(
													i,
													msg.content,
													messages,
													(msgs) => (messages = msgs),
													(idx) => (editingIndex = idx)
												)}
											class="px-3 py-1 bg-green-500 rounded text-sm hover:bg-green-600 transition"
											>Save</button
										>
										<button
											onclick={() => {
												editingIndex = null;
											}}
											class="px-3 py-1 bg-gray-600 rounded text-sm hover:bg-gray-500 transition"
											>Cancel</button
										>
									</div>
								{:else}
										{#if msg.role === 'assistant'}
											<Markdown content={msg.content} />
											{#if msg.variants && msg.variants.length > 1}
												<div class="flex justify-center items-center gap-2 mt-2">
													<button
														onclick={() => selectVariant(i, (msg.selectedVariant || 0) - 1, messages, (msgs) => (messages = msgs))}
														disabled={(msg.selectedVariant || 0) === 0}
														aria-label="Previous variant"
														class="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition disabled:opacity-50 disabled:cursor-not-allowed"
													>
														<svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiChevronLeft}" /></svg>
													</button>
													<span class="text-sm text-gray-400">{(msg.selectedVariant || 0) + 1} / {msg.variants.length}</span>
													<button
														onclick={() => selectVariant(i, (msg.selectedVariant || 0) + 1, messages, (msgs) => (messages = msgs))}
														disabled={(msg.selectedVariant || 0) === msg.variants.length - 1}
														aria-label="Next variant"
														class="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition disabled:opacity-50 disabled:cursor-not-allowed"
													>
														<svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiChevronRight}" /></svg>
													</button>
												</div>
											{/if}
										{:else}
											{msg.content}
										{/if}

										<div class="flex justify-end gap-2 mt-1">
											{#if msg.role === 'user'}
												<button
													onclick={() => startEdit(i, (idx) => (editingIndex = idx))}
													title="Edit"
													class="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition"
													><svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiPencil}" /></svg></button
												>
											{/if}
											{#if msg.role === 'assistant'}
												<button
													onclick={() => startEdit(i, (idx) => (editingIndex = idx))}
													title="Edit"
													class="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition"
													><svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiPencil}" /></svg></button
												>
												<button
													onclick={() =>
														regenerateMessage(
															i,
															chatId,
															messages,
															(load) => (loading = load),
															(msgs) => (messages = msgs)
														)}
													title="Regenerate"
													disabled={loading}
													class="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition disabled:opacity-50"
												>
													<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiRefresh}" /></svg>
												</button>
											{/if}
											<button
												onclick={() => chatId && msg.id && deleteMessage(chatId, msg.id, messages, (msgs) => (messages = msgs))}
												title="Delete"
												class="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition"
												><svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="{mdiTrashCan}" /></svg></button
											>
										</div>
									{/if}
						
							</div>
						{/if}
					{/each}

					{#if loading}
						<div class="italic text-gray-400 mb-2 p-3 rounded-xl bg-gray-700">Thinking...</div>
					{/if}
				</div>
			</div>

			<div class="input-container flex gap-2 mt-2">
				<textarea
					bind:value={input}
					placeholder="Type your action..."
					rows="2"
					class="flex-1 p-3 rounded-lg bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
				></textarea>
				<button
					onclick={() =>
						sendMessage(
							input,
							chatId,
							messages,
							(inp) => (input = inp),
							(load) => (loading = load),
							(msgs) => (messages = msgs)
						)}
					disabled={loading || !chatId}
					class="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
				>
					{loading ? 'Thinking...' : 'Send'}
				</button>
			</div>
		</div>
	</div>
</main>
