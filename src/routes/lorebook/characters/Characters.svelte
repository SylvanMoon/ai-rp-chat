<script lang="ts">
	let {
		characters,
		editingCharacter = $bindable(),
		expandedCharacters = $bindable(),
		addingCharacter = $bindable(),
		newCharacterName = $bindable(),
		newCharacterDescription = $bindable(),
		newCharacterRelationships = $bindable(),
		newCharacterAliases = $bindable(),
		currentLorebook,
		updateCharacter,
		deleteCharacter,
		addCharacter,
		addNewRelationship,
		removeNewRelationship,
		addEditingRelationship,
		removeEditingRelationship
	} = $props();
</script>

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
