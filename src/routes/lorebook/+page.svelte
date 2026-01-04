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

	let lorebookName = $state('');
	let lorebookDescription = $state('');
	let currentLorebook = $state<any>(null);
	let allLorebooks = $state<any[]>([]);
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

	let editingCharacter = $state<any>(null);
	let editingPlace = $state<any>(null);
	let editingQuest = $state<any>(null);

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
				onclick={() => { currentLorebook = null; characters = []; places = []; quests = []; }}
				class="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
			>
				Back to List
			</button>
		</div>

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
							{#if editingCharacter?.id === char.id}
								<form onsubmit={async (event) => { await updateCharacter(event, editingCharacter, characters); editingCharacter = null; }} class="flex flex-col gap-2">
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
									<input
										type="text"
										bind:value={editingCharacter.relationships}
										class="p-1 rounded bg-gray-600 text-white"
										placeholder="Relationships (JSON)"
									/>
									<input
										type="text"
										bind:value={editingCharacter.aliases}
										class="p-1 rounded bg-gray-600 text-white"
										placeholder="Aliases (JSON array)"
									/>
									<div class="flex gap-2">
										<button type="submit" class="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-sm">Save</button>
										<button type="button" onclick={() => editingCharacter = null} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
									</div>
								</form>
							{:else}
								<div class="flex justify-between items-start">
									<div>
										<strong>{char.name}</strong>: {char.description}
									</div>
									<div class="flex gap-1 ml-2">
										<button
											onclick={() => editingCharacter = { ...char }}
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
				<form onsubmit={async (event) => { const data = await addCharacter(event, newCharacterName, newCharacterDescription, newCharacterRelationships, newCharacterAliases, currentLorebook); if (data) { characters = [...characters, data]; newCharacterName = ''; newCharacterDescription = ''; newCharacterRelationships = ''; newCharacterAliases = ''; } }} class="flex flex-col gap-2">
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
							{#if editingPlace?.id === place.id}
								<form onsubmit={async (event) => { await updatePlace(event, editingPlace, places); editingPlace = null; }} class="flex flex-col gap-2">
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
										<button type="button" onclick={() => editingPlace = null} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
									</div>
								</form>
							{:else}
								<div class="flex justify-between items-start">
									<div>
										<strong>{place.name}</strong>: {place.description}
									</div>
									<div class="flex gap-1 ml-2">
										<button
											onclick={() => editingPlace = { ...place }}
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
				<form onsubmit={async (event) => { await addPlace(event, newPlaceName, newPlaceDescription, currentLorebook, places); newPlaceName = ''; newPlaceDescription = ''; }} class="flex flex-col gap-2">
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
							{#if editingQuest?.id === quest.id}
								<form onsubmit={async (event) => { await updateQuest(event, editingQuest, quests); editingQuest = null; }} class="flex flex-col gap-2">
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
										<button type="button" onclick={() => editingQuest = null} class="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-white text-sm">Cancel</button>
									</div>
								</form>
							{:else}
								<div class="flex justify-between items-start">
									<div>
										{quest.description}
									</div>
									<div class="flex gap-1 ml-2">
										<button
											onclick={() => editingQuest = { ...quest }}
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
				<form onsubmit={async (event) => { await addQuest(event, newQuestDescription, newQuestCharacters, currentLorebook, quests); newQuestDescription = ''; newQuestCharacters = ''; }} class="flex flex-col gap-2">
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