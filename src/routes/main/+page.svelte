<script lang="ts">
	import Markdown from '$lib/Markdown.svelte';
	import type { Message } from '$lib/chatStore';
	import { mdiPencil, mdiTrashCan, mdiRefresh, mdiChevronLeft, mdiChevronRight } from '@mdi/js';
	import {
		deleteMessage,
		startEdit,
		saveEdit,
		sendMessage,
		regenerateMessage,
		selectVariant,
		loadMessages,
		initializeChat
	} from '$lib/chatStore';
	import { createSidebarStore } from './components/sidebar/sidebar';

	let input = $state('');
	let loading = $state(false);
	let chatId = $state<string | null>(null);
	let editingIndex = $state<number | null>(null);

	let messages = $state<Message[]>([
		{
			role: 'system',
			content: 'You are a roleplaying game narrator. Stay in character and describe scenes vividly.'
		}
	]);

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
</script>

<main class="flex min-h-screen bg-gray-900 text-white font-sans">
	<!-- Sidebar -->
	<aside class="bg-gray-800 border-r border-gray-700 transition-all duration-300 {sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden">
		<div class="p-4 {sidebarOpen ? 'block' : 'hidden'}">
			<h2 class="text-xl font-bold mb-4">Menu</h2>
			<div class="space-y-2">
				<button
					onclick={() => sidebar.goToLorebook()}
					class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
				>
					Manage Lorebooks
				</button>
				<button
					onclick={() => sidebar.newAdventure((id) => chatId = id, (msgs) => messages = msgs)}
					disabled={loading}
					class="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
				>
					New Adventure
				</button>
				<button
					onclick={() => sidebar.saveChat(chatId)}
					disabled={!chatId}
					class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
				>
					Save Chat
				</button>
				<button
					onclick={() => sidebar.duplicateChat(chatId, messages, (id) => chatId = id)}
					disabled={!chatId || loading}
					class="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
				>
					Duplicate Chat
				</button>
				<button
					onclick={() => sidebar.loadChats()}
					class="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
				>
					Load Chats
				</button>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col">
		<!-- Header -->
		<header class="bg-gray-900 p-4 border-b border-gray-700 flex items-center">
			<button
				onclick={() => sidebar.toggleSidebar()}
				class="mr-4 p-2 bg-gray-700 rounded hover:bg-gray-600 transition"
				aria-label="Toggle sidebar"
			>
				☰
			</button>
			<h1 class="text-2xl font-bold">AI RP Chat</h1>
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
													onclick={() =>
														regenerateMessage(
															i,
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
												onclick={() => deleteMessage(i, messages, (msgs) => (messages = msgs))}
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
