<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let mainPrompt = $state('You are a roleplaying game narrator. Stay in character and describe scenes vividly.');
	let currentChatId = $state(localStorage.getItem('chatId'));

	onMount(async () => {
		if (currentChatId) {
			const { data, error } = await supabase
				.from('chats')
				.select('main_prompt')
				.eq('id', currentChatId)
				.single();
			if (!error && data) {
				mainPrompt = data.main_prompt || mainPrompt;
			}
		}
	});

	async function savePrompt() {
		if (!currentChatId) {
			alert('No current chat selected.');
			return;
		}
		const { error } = await supabase
			.from('chats')
			.update({ main_prompt: mainPrompt })
			.eq('id', currentChatId);
		if (error) {
			alert('Error saving prompt: ' + error.message);
		} else {
			alert('Main prompt saved!');
		}
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<button
		onclick={() => goto('/main')}
		class="mb-4 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
	>
		Back
	</button>
	<h1 class="text-3xl font-bold mb-6 text-white">Main Prompt</h1>
	<p class="mb-4 text-white">This is the system prompt used for all new adventures. There is only one main prompt.</p>
	<textarea
		bind:value={mainPrompt}
		class="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none text-white bg-gray-800"
		placeholder="Enter your main prompt here..."
	></textarea>
	<button
		onclick={savePrompt}
		class="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
	>
		Save Prompt
	</button>
</div>
