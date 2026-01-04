<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	let lorebookName = $state('');
	let lorebookDescription = $state('');
	let currentLorebook = $state<any>(null);
	let characters = $state<any[]>([]);
	let places = $state<any[]>([]);
	let quests = $state<any[]>([]);

	let newCharacterName = $state('');
	let newCharacterDescription = $state('');
	let newCharacterRelationships = $state('');
	let newCharacterAliases = $state('');

	let newPlaceName = $state('');
	let newPlaceDescription = $state('');

	let newQuestDescription = $state('');
	let newQuestCharacters = $state('');

	async function createLorebook() {
		if (!lorebookName.trim()) return;

		const { data, error } = await supabase
			.from('lorebooks')
			.insert([{ name: lorebookName, description: lorebookDescription }])
			.select()
			.single();

		if (error) {
			console.error('Error creating lorebook:', error);
			return;
		}

		currentLorebook = data;
		lorebookName = '';
		lorebookDescription = '';
		loadLorebookData();
	}

	async function loadLorebookData() {
		if (!currentLorebook) return;

		// Load characters
		const { data: chars } = await supabase
			.from('lore_characters')
			.select('*')
			.eq('lorebook_id', currentLorebook.id);
		characters = chars || [];

		// Load places
		const { data: pls } = await supabase
			.from('lore_places')
			.select('*')
			.eq('lorebook_id', currentLorebook.id);
		places = pls || [];

		// Load quests
		const { data: qsts } = await supabase
			.from('lore_quests')
			.select('*')
			.eq('lorebook_id', currentLorebook.id);
		quests = qsts || [];
	}

	async function addCharacter() {
		if (!newCharacterName.trim() || !currentLorebook) return;

		const relationships = newCharacterRelationships ? JSON.parse(newCharacterRelationships) : {};
		const aliases = newCharacterAliases ? JSON.parse(newCharacterAliases) : [];

		const { data, error } = await supabase
			.from('lore_characters')
			.insert([{
				lorebook_id: currentLorebook.id,
				name: newCharacterName,
				description: newCharacterDescription,
				relationships,
				aliases
			}])
			.select()
			.single();

		if (error) {
			console.error('Error adding character:', error);
			return;
		}

		characters = [...characters, data];
		newCharacterName = '';
		newCharacterDescription = '';
		newCharacterRelationships = '';
		newCharacterAliases = '';
	}

	async function addPlace() {
		if (!newPlaceName.trim() || !currentLorebook) return;

		const { data, error } = await supabase
			.from('lore_places')
			.insert([{
				lorebook_id: currentLorebook.id,
				name: newPlaceName,
				description: newPlaceDescription
			}])
			.select()
			.single();

		if (error) {
			console.error('Error adding place:', error);
			return;
		}

		places = [...places, data];
		newPlaceName = '';
		newPlaceDescription = '';
	}

	async function addQuest() {
		if (!newQuestDescription.trim() || !currentLorebook) return;

		const involvedCharacters = newQuestCharacters ? JSON.parse(newQuestCharacters) : [];

		const { data, error } = await supabase
			.from('lore_quests')
			.insert([{
				lorebook_id: currentLorebook.id,
				description: newQuestDescription,
				involved_characters: involvedCharacters
			}])
			.select()
			.single();

		if (error) {
			console.error('Error adding quest:', error);
			return;
		}

		quests = [...quests, data];
		newQuestDescription = '';
		newQuestCharacters = '';
	}
</script>

<main class="max-w-4xl mx-auto my-8 p-6 rounded-xl shadow-xl bg-gray-900 font-sans text-white flex flex-col gap-4 min-h-screen">
	<h1 class="text-center text-3xl font-bold mb-4 text-white">Lorebook Manager</h1>

	{#if !currentLorebook}
		<div class="bg-gray-800 p-4 rounded-lg">
			<h2 class="text-xl font-semibold mb-2">Create New Lorebook</h2>
			<form on:submit|preventDefault={createLorebook} class="flex flex-col gap-2">
				<input
					type="text"
					placeholder="Lorebook Name"
					bind:value={lorebookName}
					class="p-2 rounded bg-gray-700 text-white"
					required
				/>
				<textarea
					placeholder="Description"
					bind:value={lorebookDescription}
					class="p-2 rounded bg-gray-700 text-white"
					rows="3"
				></textarea>
				<button type="submit" class="bg-blue-600 hover:bg-blue-700 p-2 rounded text-white">Create Lorebook</button>
			</form>
		</div>
	{:else}
		<div class="bg-gray-800 p-4 rounded-lg">
			<h2 class="text-xl font-semibold mb-2">{currentLorebook.name}</h2>
			<p class="text-gray-300">{currentLorebook.description}</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Characters -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Characters</h3>
				<ul class="mb-4">
					{#each characters as char}
						<li class="mb-2 p-2 bg-gray-700 rounded">
							<strong>{char.name}</strong>: {char.description}
						</li>
					{/each}
				</ul>
				<form on:submit|preventDefault={addCharacter} class="flex flex-col gap-2">
					<input
						type="text"
						placeholder="Character Name"
						bind:value={newCharacterName}
						class="p-2 rounded bg-gray-700 text-white"
						required
					/>
					<textarea
						placeholder="Description"
						bind:value={newCharacterDescription}
						class="p-2 rounded bg-gray-700 text-white"
						rows="2"
					></textarea>
					<input
						type="text"
						placeholder="Relationships (JSON)"
						bind:value={newCharacterRelationships}
						class="p-2 rounded bg-gray-700 text-white"
					/>
					<input
						type="text"
						placeholder="Aliases (JSON array)"
						bind:value={newCharacterAliases}
						class="p-2 rounded bg-gray-700 text-white"
					/>
					<button type="submit" class="bg-green-600 hover:bg-green-700 p-2 rounded text-white">Add Character</button>
				</form>
			</div>

			<!-- Places -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Places</h3>
				<ul class="mb-4">
					{#each places as place}
						<li class="mb-2 p-2 bg-gray-700 rounded">
							<strong>{place.name}</strong>: {place.description}
						</li>
					{/each}
				</ul>
				<form on:submit|preventDefault={addPlace} class="flex flex-col gap-2">
					<input
						type="text"
						placeholder="Place Name"
						bind:value={newPlaceName}
						class="p-2 rounded bg-gray-700 text-white"
						required
					/>
					<textarea
						placeholder="Description"
						bind:value={newPlaceDescription}
						class="p-2 rounded bg-gray-700 text-white"
						rows="2"
					></textarea>
					<button type="submit" class="bg-blue-600 hover:bg-blue-700 p-2 rounded text-white">Add Place</button>
				</form>
			</div>

			<!-- Quests -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Quests</h3>
				<ul class="mb-4">
					{#each quests as quest}
						<li class="mb-2 p-2 bg-gray-700 rounded">
							{quest.description}
						</li>
					{/each}
				</ul>
				<form on:submit|preventDefault={addQuest} class="flex flex-col gap-2">
					<textarea
						placeholder="Quest Description"
						bind:value={newQuestDescription}
						class="p-2 rounded bg-gray-700 text-white"
						rows="2"
						required
					></textarea>
					<input
						type="text"
						placeholder="Involved Characters (JSON array)"
						bind:value={newQuestCharacters}
						class="p-2 rounded bg-gray-700 text-white"
					/>
					<button type="submit" class="bg-purple-600 hover:bg-purple-700 p-2 rounded text-white">Add Quest</button>
				</form>
			</div>
		</div>
	{/if}
</main>