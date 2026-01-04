<script lang="ts">
	let {
		quests,
		editingQuest = $bindable(),
		expandedQuests = $bindable(),
		addingQuest = $bindable(),
		newQuestDescription = $bindable(),
		newQuestCharacters = $bindable(),
		currentLorebook,
		updateQuest,
		deleteQuest,
		addQuest
	} = $props();
</script>

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
