<script lang="ts">
	import { goto } from '$app/navigation';
	import Characters from './characters/Characters.svelte';
	import Places from './places/Places.svelte';
	import Quests from './quests/Quests.svelte';
	import {
		loadAllLorebooks,
		selectLorebook,
		createLorebook,
		addCharacter,
		addPlace,
		addQuest,
		updateCharacter,
		deleteCharacter,
		updatePlace,
		deletePlace,
		updateQuest,
		deleteQuest
	} from './lorebook';

	type Relationship = {
		type: string;
		relation: string;
		target?: string;
	};

	let lorebookName = $state('');
	let lorebookDescription = $state('');
	let currentLorebook = $state<any>(null);
	let allLorebooks = $state<any[]>([]);
	let characters = $state<any[]>([]);
	let places = $state<any[]>([]);
	let quests = $state<any[]>([]);

	let newCharacterName = $state('');
	let newCharacterDescription = $state('');
	let newCharacterRelationships = $state<Relationship[]>([]);
	let newCharacterAliases = $state('');

	let newPlaceName = $state('');
	let newPlaceDescription = $state('');

	let newQuestDescription = $state('');
	let newQuestCharacters = $state('');

	let editingCharacter = $state<any>(null);
	let editingPlace = $state<any>(null);
	let editingQuest = $state<any>(null);

	let expandedCharacters = $state(false);
	let expandedPlaces = $state(false);
	let expandedQuests = $state(false);

	let addingCharacter = $state(false);
	let addingPlace = $state(false);
	let addingQuest = $state(false);

	function addNewRelationship() {
		newCharacterRelationships = [...newCharacterRelationships, { type: '', relation: '', target: '' }];
	}

	function removeNewRelationship(index: number) {
		newCharacterRelationships = newCharacterRelationships.filter((_: Relationship, i: number) => i !== index);
	}

	function addEditingRelationship() {
		if (!editingCharacter.relationships) editingCharacter.relationships = [];
		editingCharacter.relationships = [...editingCharacter.relationships, { type: '', relation: '', target: '' }];
	}

	function removeEditingRelationship(index: number) {
		editingCharacter.relationships = editingCharacter.relationships.filter((_: Relationship, i: number) => i !== index);
	}

	$effect(() => {
		loadAllLorebooks().then(data => {
			allLorebooks = data;
		});
	});
</script>

<main class="max-w-4xl mx-auto my-8 p-6 rounded-xl shadow-xl bg-gray-900 font-sans text-white flex flex-col gap-4 min-h-screen">
	<h1 class="text-center text-3xl font-bold mb-4 text-white">Lorebook Manager</h1>
	<button
		onclick={() => goto('/main')}
		class="self-start px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
	>
		Back to Main
	</button>

	{#if !currentLorebook}
		<div class="bg-gray-800 p-4 rounded-lg">
			<h2 class="text-xl font-semibold mb-4">Your Lorebooks</h2>
			{#if allLorebooks.length === 0}
				<p class="text-gray-400 mb-4">No lorebooks yet. Create your first one below!</p>
			{:else}
				<ul class="mb-4 space-y-2">
					{#each allLorebooks as lorebook}
						<li class="p-3 bg-gray-700 rounded-lg flex justify-between items-center">
							<div>
								<strong class="text-white">{lorebook.name}</strong>
								<p class="text-gray-300 text-sm">{lorebook.description}</p>
							</div>
							<button
								onclick={async () => { const result = await selectLorebook(lorebook); currentLorebook = result.lorebook; characters = result.characters; places = result.places; quests = result.quests; }}
								class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
							>
								Open
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="bg-gray-800 p-4 rounded-lg">
			<h2 class="text-xl font-semibold mb-2">Create New Lorebook</h2>
			<form onsubmit={async (event) => { const data = await createLorebook(event, lorebookName, lorebookDescription); if (data) { currentLorebook = data; lorebookName = ''; lorebookDescription = ''; allLorebooks = await loadAllLorebooks(); } }} class="flex flex-col gap-2">
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
		<div class="flex gap-2 mb-4">
			<button
				onclick={() => { currentLorebook = null; characters = []; places = []; quests = []; expandedCharacters = false; expandedPlaces = false; expandedQuests = false; addingCharacter = false; addingPlace = false; addingQuest = false; }}
				class="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
			>
				Back to List
			</button>
		</div>

		<div class="bg-gray-800 p-4 rounded-lg">
			<h2 class="text-xl font-semibold mb-2">{currentLorebook.name}</h2>
			<p class="text-gray-300">{currentLorebook.description}</p>
		</div>

		<div class="grid grid-cols-1 gap-4">
			<Characters
				{characters}
				bind:editingCharacter
				bind:expandedCharacters
				bind:addingCharacter
				bind:newCharacterName
				bind:newCharacterDescription
				bind:newCharacterRelationships
				bind:newCharacterAliases
				{currentLorebook}
				{updateCharacter}
				{deleteCharacter}
				{addCharacter}
				{addNewRelationship}
				{removeNewRelationship}
				{addEditingRelationship}
				{removeEditingRelationship}
			/>

			<Places
				{places}
				bind:editingPlace
				bind:expandedPlaces
				bind:addingPlace
				bind:newPlaceName
				bind:newPlaceDescription
				{currentLorebook}
				{updatePlace}
				{deletePlace}
				{addPlace}
			/>

			<Quests
				{quests}
				bind:editingQuest
				bind:expandedQuests
				bind:addingQuest
				bind:newQuestDescription
				bind:newQuestCharacters
				{currentLorebook}
				{updateQuest}
				{deleteQuest}
				{addQuest}
			/>
		</div>
	{/if}
</main>