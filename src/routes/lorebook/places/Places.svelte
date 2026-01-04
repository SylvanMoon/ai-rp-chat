<script lang="ts">
	let {
		places,
		editingPlace = $bindable(),
		expandedPlaces = $bindable(),
		addingPlace = $bindable(),
		newPlaceName = $bindable(),
		newPlaceDescription = $bindable(),
		currentLorebook,
		updatePlace,
		deletePlace,
		addPlace
	} = $props();
</script>

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
