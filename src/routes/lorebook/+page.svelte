<script lang="ts">
	import { goto } from '$app/navigation';
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
			<!-- Characters -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Characters ({characters.length})</h3>
				{#if !expandedCharacters}
					<button onclick={() => { expandedCharacters = true; addingCharacter = true; }} class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-sm">Add Character</button>
				{:else}
					<ul class="mb-4">
						{#each characters as char}
							<li class="mb-2 p-2 bg-gray-700 rounded">
								{#if editingCharacter?.id === char.id}
									<form onsubmit={async (event) => { await updateCharacter(event, editingCharacter, characters); editingCharacter = null; expandedCharacters = false; }} class="flex flex-col gap-2">
										<input
											type="text"
											bind:value={editingCharacter.name}
											class="p-1 rounded bg-gray-600 text-white"
											required
										/>
										<textarea
											bind:value={editingCharacter.description}
											class="p-1 rounded bg-gray-600 text-white"
											rows="2"
										></textarea>
										<div class="mb-2">
											<label class="block text-sm font-medium mb-1">Relationships</label>
											{#each editingCharacter.relationships as rel, index}
												<div class="flex gap-2 mb-1">
													<input
														type="text"
														placeholder="Type"
														bind:value={rel.type}
														class="p-1 rounded bg-gray-600 text-white flex-1"
													/>
													<input
														type="text"
														placeholder="Relation"
														bind:value={rel.relation}
														class="p-1 rounded bg-gray-600 text-white flex-1"
													/>
													<input
														type="text"
														placeholder="Target (optional)"
														bind:value={rel.target}
														class="p-1 rounded bg-gray-600 text-white flex-1"
													/>
													<button
														type="button"
														onclick={() => removeEditingRelationship(index)}
														class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-sm"
													>
														Remove
													</button>
												</div>
											{/each}
											<button
												type="button"
												onclick={addEditingRelationship}
												class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-sm mt-1"
											>
												Add Relationship
											</button>
										</div>
										<input
											type="text"
											bind:value={editingCharacter.aliases}
											class="p-1 rounded bg-gray-600 text-white"
											placeholder="Aliases (JSON array)"
										/>
										<div class="flex gap-2">
											<button type="submit" class="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-sm">Save</button>
											<button type="button" onclick={() => { editingCharacter = null; expandedCharacters = false; }} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
										</div>
									</form>
								{:else}
									<div class="flex justify-between items-start">
										<div>
											<strong>{char.name}</strong>: {char.description}
										</div>
										<div class="flex gap-1 ml-2">
											<button
												onclick={() => { 
													editingCharacter = { ...char };
													if (typeof editingCharacter.relationships === 'string') {
														editingCharacter.relationships = JSON.parse(editingCharacter.relationships);
													}
													if (!Array.isArray(editingCharacter.relationships)) {
														editingCharacter.relationships = [];
													}
													expandedCharacters = true;
												}}
												class="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white text-sm"
											>
												Edit
											</button>
											<button
												onclick={() => deleteCharacter(char, characters)}
												class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-sm"
											>
												Delete
											</button>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if addingCharacter}
						<form onsubmit={async (event) => { const data = await addCharacter(event, newCharacterName, newCharacterDescription, newCharacterRelationships, newCharacterAliases, currentLorebook); if (data) { characters = [...characters, data]; newCharacterName = ''; newCharacterDescription = ''; newCharacterRelationships = []; newCharacterAliases = ''; addingCharacter = false; expandedCharacters = false; } }} class="flex flex-col gap-2">
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
							<div class="mb-2">
								<label class="block text-sm font-medium mb-1">Relationships</label>
								{#each newCharacterRelationships as rel, index}
									<div class="flex gap-2 mb-1">
										<input
											type="text"
											placeholder="Type"
											bind:value={rel.type}
											class="p-1 rounded bg-gray-700 text-white flex-1"
										/>
										<input
											type="text"
											placeholder="Relation"
											bind:value={rel.relation}
											class="p-1 rounded bg-gray-700 text-white flex-1"
										/>
										<input
											type="text"
											placeholder="Target (optional)"
											bind:value={rel.target}
											class="p-1 rounded bg-gray-700 text-white flex-1"
										/>
										<button
											type="button"
											onclick={() => removeNewRelationship(index)}
											class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-sm"
										>
											Remove
										</button>
									</div>
								{/each}
								<button
									type="button"
									onclick={addNewRelationship}
									class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-sm mt-1"
								>
									Add Relationship
								</button>
							</div>
							<input
								type="text"
								placeholder="Aliases (JSON array)"
								bind:value={newCharacterAliases}
								class="p-2 rounded bg-gray-700 text-white"
							/>
							<div class="flex gap-2">
								<button type="submit" class="bg-green-600 hover:bg-green-700 p-2 rounded text-white">Add Character</button>
								<button type="button" onclick={() => { addingCharacter = false; expandedCharacters = false; newCharacterName = ''; newCharacterDescription = ''; newCharacterRelationships = []; newCharacterAliases = ''; }} class="bg-gray-600 hover:bg-gray-700 p-2 rounded text-white">Cancel</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>

			<!-- Places -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Places ({places.length})</h3>
				{#if !expandedPlaces}
					<button onclick={() => { expandedPlaces = true; addingPlace = true; }} class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-sm">Add Place</button>
				{:else}
					<ul class="mb-4">
						{#each places as place}
							<li class="mb-2 p-2 bg-gray-700 rounded">
								{#if editingPlace?.id === place.id}
									<form onsubmit={async (event) => { await updatePlace(event, editingPlace, places); editingPlace = null; expandedPlaces = false; }} class="flex flex-col gap-2">
										<input
											type="text"
											bind:value={editingPlace.name}
											class="p-1 rounded bg-gray-600 text-white"
											required
										/>
										<textarea
											bind:value={editingPlace.description}
											class="p-1 rounded bg-gray-600 text-white"
											rows="2"
										></textarea>
										<div class="flex gap-2">
											<button type="submit" class="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-sm">Save</button>
											<button type="button" onclick={() => { editingPlace = null; expandedPlaces = false; }} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
										</div>
									</form>
								{:else}
									<div class="flex justify-between items-start">
										<div>
											<strong>{place.name}</strong>: {place.description}
										</div>
										<div class="flex gap-1 ml-2">
											<button
												onclick={() => { editingPlace = { ...place }; expandedPlaces = true; }}
												class="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white text-sm"
											>
												Edit
											</button>
											<button
												onclick={() => deletePlace(place, places)}
												class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-sm"
											>
												Delete
											</button>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if addingPlace}
						<form onsubmit={async (event) => { await addPlace(event, newPlaceName, newPlaceDescription, currentLorebook, places); newPlaceName = ''; newPlaceDescription = ''; addingPlace = false; expandedPlaces = false; }} class="flex flex-col gap-2">
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
							<div class="flex gap-2">
								<button type="submit" class="bg-blue-600 hover:bg-blue-700 p-2 rounded text-white">Add Place</button>
								<button type="button" onclick={() => { addingPlace = false; expandedPlaces = false; newPlaceName = ''; newPlaceDescription = ''; }} class="bg-gray-600 hover:bg-gray-700 p-2 rounded text-white">Cancel</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>

			<!-- Quests -->
			<div class="bg-gray-800 p-4 rounded-lg">
				<h3 class="text-lg font-semibold mb-2">Quests ({quests.length})</h3>
				{#if !expandedQuests}
					<button onclick={() => { expandedQuests = true; addingQuest = true; }} class="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-white text-sm">Add Quest</button>
				{:else}
					<ul class="mb-4">
						{#each quests as quest}
							<li class="mb-2 p-2 bg-gray-700 rounded">
								{#if editingQuest?.id === quest.id}
									<form onsubmit={async (event) => { await updateQuest(event, editingQuest, quests); editingQuest = null; expandedQuests = false; }} class="flex flex-col gap-2">
										<textarea
											bind:value={editingQuest.description}
											class="p-1 rounded bg-gray-600 text-white"
											rows="2"
											required
										></textarea>
										<input
											type="text"
											bind:value={editingQuest.involved_characters}
											class="p-1 rounded bg-gray-600 text-white"
											placeholder="Involved Characters (JSON array)"
										/>
										<div class="flex gap-2">
											<button type="submit" class="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-sm">Save</button>
											<button type="button" onclick={() => { editingQuest = null; expandedQuests = false; }} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
										</div>
									</form>
								{:else}
									<div class="flex justify-between items-start">
										<div>
											{quest.description}
										</div>
										<div class="flex gap-1 ml-2">
											<button
												onclick={() => { editingQuest = { ...quest }; expandedQuests = true; }}
												class="bg-yellow-600 hover:bg-yellow-700 px-2 py-1 rounded text-white text-sm"
											>
												Edit
											</button>
											<button
												onclick={() => deleteQuest(quest, quests)}
												class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-sm"
											>
												Delete
											</button>
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
					{#if addingQuest}
						<form onsubmit={async (event) => { await addQuest(event, newQuestDescription, newQuestCharacters, currentLorebook, quests); newQuestDescription = ''; newQuestCharacters = ''; addingQuest = false; expandedQuests = false; }} class="flex flex-col gap-2">
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
							<div class="flex gap-2">
								<button type="submit" class="bg-purple-600 hover:bg-purple-700 p-2 rounded text-white">Add Quest</button>
								<button type="button" onclick={() => { addingQuest = false; expandedQuests = false; newQuestDescription = ''; newQuestCharacters = ''; }} class="bg-gray-600 hover:bg-gray-700 p-2 rounded text-white">Cancel</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</main>