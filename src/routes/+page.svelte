<script lang="ts">
	import Markdown from '$lib/Markdown.svelte';
	import type { Message } from '$lib/chatStore';
	import { mdiPencil, mdiTrashCan } from '@mdi/js';
	import {
		newAdventure,
		deleteMessage,
		startEdit,
		saveEdit,
		sendMessage,
		initializeChat
	} from '$lib/chatStore';

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

	$effect(() => {
		initializeChat(
			(id) => (chatId = id),
			(msgs) => (messages = msgs)
		);
	});
</script>

<main
	class="max-w-4xl mx-auto my-8 p-6 rounded-xl shadow-xl bg-gray-900 font-sans text-white flex flex-col gap-4 min-h-screen"
>
	<h1 class="text-center text-3xl font-bold mb-4 text-white">AI RP Chat</h1>

	<button
		onclick={() =>
			newAdventure(
				(id) => (chatId = id),
				(msgs) => (messages = msgs)
			)}
		disabled={loading}
		class="self-center mb-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
	>
		New Adventure
	</button>

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
</main>
