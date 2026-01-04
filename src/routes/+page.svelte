<script lang="ts">
	import Markdown from '$lib/Markdown.svelte';
	import type { Message } from '$lib/chatStore';
	import {
		newAdventure,
		loadMessages,
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
			(id) => chatId = id,
			(msgs) => messages = msgs
		);
	});
</script>

<main class="max-w-4xl mx-auto my-8 bg-gradient-to-b from-blue-50 to-blue-100 p-8 rounded-lg shadow-lg font-serif">
	<h1 class="text-center text-2xl text-gray-800 mb-4">AI RP Chat</h1>

	<button onclick={() => newAdventure((id) => chatId = id, (msgs) => messages = msgs)} disabled={loading} class="block mx-auto mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
		New Adventure
	</button>

	<div class="chat-container border-2 border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
		<div class="chat h-96 overflow-y-auto p-2">
			{#each messages as msg, i}
				{#if msg.role !== 'system'}
					<div class="message relative mb-4 p-3 rounded-lg max-w-[70%] break-words {msg.role === 'user' ? 'bg-blue-500 text-white ml-auto text-right rounded-br-none' : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-none'}">
						{#if editingIndex === i}
							<textarea bind:value={msg.content} rows="3" class="w-full p-2 border border-gray-300 rounded resize-y font-inherit"></textarea>
							<div class="message-actions absolute bottom-1 right-1 flex gap-1">
								<button onclick={() => saveEdit(i, msg.content, messages, (msgs) => messages = msgs, (idx) => editingIndex = idx)} class="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">Save</button>
								<button onclick={() => { editingIndex = null; }} class="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Cancel</button>
							</div>
						{:else}
							{#if msg.role === 'assistant'}
								<Markdown content={msg.content} />
							{:else}
								{msg.content}
							{/if}
							<div class="message-actions absolute bottom-1 right-1 flex gap-1">
								{#if msg.role === 'user'}
									<button onclick={() => startEdit(i, (idx) => editingIndex = idx)} title="Edit" class="w-8 h-8 bg-black bg-opacity-10 hover:bg-opacity-20 rounded flex items-center justify-center">✏️</button>
								{/if}
								<button onclick={() => deleteMessage(i, messages, (msgs) => messages = msgs)} title="Delete" class="w-8 h-8 bg-black bg-opacity-10 hover:bg-opacity-20 rounded flex items-center justify-center">🗑️</button>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
			{#if loading}
				<div class="message assistant loading italic text-gray-600 mb-4 p-3 rounded-lg bg-gray-100 border border-gray-200 rounded-bl-none">
					Thinking...
				</div>
			{/if}
		</div>
	</div>

	<div class="input-container flex gap-2">
		<textarea bind:value={input} placeholder="What do you do?" rows="2" class="flex-1 p-2 border border-gray-300 rounded resize-none font-inherit"></textarea>
		<button onclick={() => sendMessage(input, chatId, messages, (inp) => input = inp, (load) => loading = load, (msgs) => messages = msgs)} disabled={loading || !chatId} class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed self-end">
			{loading ? 'Thinking...' : 'Send'}
		</button>
	</div>
</main>

