<script lang="ts">
	import { supabase } from '$lib/client/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SessionCharacter } from '$lib/helpers/sessionCharacterManager';
	import type { SessionPlace } from '$lib/helpers/sessionPlaceManager';
	import type { SessionPlotPoint } from '$lib/helpers/sessionPlotPointsManager';

	let chatId: string | null = null;
	let characters: SessionCharacter[] = [];
	let places: SessionPlace[] = [];
	let plotPoints: SessionPlotPoint[] = [];
	let editingCharacter: SessionCharacter | null = null;
	let editingPlace: SessionPlace | null = null;
	let editingPlotPoint: SessionPlotPoint | null = null;

	onMount(() => {
		chatId = localStorage.getItem('chatId');
		if (chatId) {
			loadSessionData();
		}
	});

	async function loadSessionData() {
		if (!chatId) return;

		// Load characters
		const { data: charData, error: charError } = await supabase
			.from('session_characters')
			.select('*')
			.eq('chat_id', chatId);
		if (charError) console.error(charError);
		else characters = charData || [];

		// Load places
		const { data: placeData, error: placeError } = await supabase
			.from('session_places')
			.select('*')
			.eq('chat_id', chatId);
		if (placeError) console.error(placeError);
		else places = placeData || [];

		// Load plot points
		const { data: plotData, error: plotError } = await supabase
			.from('session_plot_points')
			.select('*')
			.eq('chat_id', chatId);
		if (plotError) console.error(plotError);
		else plotPoints = plotData || [];
	}

	function editCharacter(char: SessionCharacter) {
		editingCharacter = { ...char };
	}

	function editPlace(place: SessionPlace) {
		editingPlace = { ...place };
	}

	function editPlotPoint(pp: SessionPlotPoint) {
		editingPlotPoint = { ...pp };
	}

	async function saveCharacter() {
		if (!editingCharacter) return;
		const { error } = await supabase
			.from('session_characters')
			.update({
				name: editingCharacter.name,
				description: editingCharacter.description,
				state: editingCharacter.state,
				importance: editingCharacter.importance,
				reinforcement_count: editingCharacter.reinforcement_count,
				last_mentioned_turn: editingCharacter.last_mentioned_turn
			})
			.eq('id', editingCharacter.id);
		if (error) console.error(error);
		else {
			loadSessionData();
			editingCharacter = null;
		}
	}

	async function savePlace() {
		if (!editingPlace) return;
		const { error } = await supabase
			.from('session_places')
			.update({
				name: editingPlace.name,
				description: editingPlace.description,
				state: editingPlace.state,
				importance: editingPlace.importance,
				reinforcement_count: editingPlace.reinforcement_count,
				last_mentioned_turn: editingPlace.last_mentioned_turn
			})
			.eq('id', editingPlace.id);
		if (error) console.error(error);
		else {
			loadSessionData();
			editingPlace = null;
		}
	}

	async function savePlotPoint() {
		if (!editingPlotPoint) return;
		const { error } = await supabase
			.from('session_plot_points')
			.update({
				title: editingPlotPoint.title,
				description: editingPlotPoint.description,
				state: editingPlotPoint.state,
				importance: editingPlotPoint.importance,
				reinforcement_count: editingPlotPoint.reinforcement_count,
				last_mentioned_turn: editingPlotPoint.last_mentioned_turn
			})
			.eq('id', editingPlotPoint.id);
		if (error) console.error(error);
		else {
			loadSessionData();
			editingPlotPoint = null;
		}
	}

	async function deleteCharacter() {
		if (!editingCharacter) return;
		if (confirm('Are you sure you want to delete this character?')) {
			const { error } = await supabase
				.from('session_characters')
				.delete()
				.eq('id', editingCharacter.id);
			if (error) console.error(error);
			else {
				loadSessionData();
				editingCharacter = null;
			}
		}
	}

	async function deletePlace() {
		if (!editingPlace) return;
		if (confirm('Are you sure you want to delete this place?')) {
			const { error } = await supabase
				.from('session_places')
				.delete()
				.eq('id', editingPlace.id);
			if (error) console.error(error);
			else {
				loadSessionData();
				editingPlace = null;
			}
		}
	}

	async function deletePlotPoint() {
		if (!editingPlotPoint) return;
		if (confirm('Are you sure you want to delete this plot point?')) {
			const { error } = await supabase
				.from('session_plot_points')
				.delete()
				.eq('id', editingPlotPoint.id);
			if (error) console.error(error);
			else {
				loadSessionData();
				editingPlotPoint = null;
			}
		}
	}
</script>

<svelte:head>
	<title>Session Data</title>
</svelte:head>

<div class="container mx-auto p-4 text-white">
	<div class="flex items-center mb-4">
		<button onclick={() => goto('/main')} class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mr-4">
			Back to Main
		</button>
		<h1 class="text-2xl font-bold">Session Data</h1>
	</div>
	{#if !chatId}
		<p>No active chat selected.</p>
	{:else}
		<div class="mb-8">
			<h2 class="text-xl font-semibold mb-2">Characters</h2>
			<table class="w-full table-auto border-collapse border border-gray-600">
				<thead>
					<tr class="bg-gray-700">
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Name</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Description</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">State</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Importance</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Reinforcement Count</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Last Mentioned Turn</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each characters as char}
						<tr class="bg-gray-800">
							<td class="border border-gray-600 px-4 py-2 text-white">{char.name}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{char.description || ''}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{char.state}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{char.importance}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{char.reinforcement_count}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{char.last_mentioned_turn ?? ''}</td>
							<td class="border border-gray-600 px-4 py-2">
								<button class="bg-blue-500 text-white px-2 py-1 rounded" onclick={() => editCharacter(char)}>Edit</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if editingCharacter}
			<div class="mb-4 p-4 border border-gray-600 rounded bg-gray-800 text-white">
				<h3 class="text-lg font-semibold mb-2">Edit Character</h3>
				<label class="block mb-2">
					Name: <input type="text" bind:value={editingCharacter.name} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Description: <textarea bind:value={editingCharacter.description} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white"></textarea>
				</label>
				<label class="block mb-2">
					State: 
					<select bind:value={editingCharacter.state} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white">
						<option value="candidate">Candidate</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="archived">Archived</option>
					</select>
				</label>
				<label class="block mb-2">
					Importance: <input type="number" bind:value={editingCharacter.importance} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Reinforcement Count: <input type="number" bind:value={editingCharacter.reinforcement_count} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Last Mentioned Turn: <input type="number" bind:value={editingCharacter.last_mentioned_turn} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" placeholder="Optional" />
				</label>
				<button onclick={saveCharacter} class="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
				<button onclick={deleteCharacter} class="bg-red-500 text-white px-4 py-2 rounded mr-2">Delete</button>
				<button onclick={() => editingCharacter = null} class="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
			</div>
		{/if}

		<div class="mb-8">
			<h2 class="text-xl font-semibold mb-2">Places</h2>
			<table class="w-full table-auto border-collapse border border-gray-600">
				<thead>
					<tr class="bg-gray-700">
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Name</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Description</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">State</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Importance</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Reinforcement Count</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Last Mentioned Turn</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each places as place}
						<tr class="bg-gray-800">
							<td class="border border-gray-600 px-4 py-2 text-white">{place.name}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{place.description || ''}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{place.state}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{place.importance}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{place.reinforcement_count}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{place.last_mentioned_turn ?? ''}</td>
							<td class="border border-gray-600 px-4 py-2">
								<button class="bg-blue-500 text-white px-2 py-1 rounded" onclick={() => editPlace(place)}>Edit</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if editingPlace}
			<div class="mb-4 p-4 border border-gray-600 rounded bg-gray-800 text-white">
				<h3 class="text-lg font-semibold mb-2">Edit Place</h3>
				<label class="block mb-2">
					Name: <input type="text" bind:value={editingPlace.name} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Description: <textarea bind:value={editingPlace.description} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white"></textarea>
				</label>
				<label class="block mb-2">
					State: 
					<select bind:value={editingPlace.state} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white">
						<option value="candidate">Candidate</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="archived">Archived</option>
					</select>
				</label>
				<label class="block mb-2">
					Importance: <input type="number" bind:value={editingPlace.importance} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Reinforcement Count: <input type="number" bind:value={editingPlace.reinforcement_count} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Last Mentioned Turn: <input type="number" bind:value={editingPlace.last_mentioned_turn} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" placeholder="Optional" />
				</label>
				<button onclick={savePlace} class="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
				<button onclick={deletePlace} class="bg-red-500 text-white px-4 py-2 rounded mr-2">Delete</button>
				<button onclick={() => editingPlace = null} class="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
			</div>
		{/if}

		<div class="mb-8">
			<h2 class="text-xl font-semibold mb-2">Plot Points</h2>
			<table class="w-full table-auto border-collapse border border-gray-600">
				<thead>
					<tr class="bg-gray-700">
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Title</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Description</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">State</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Importance</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Reinforcement Count</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Last Mentioned Turn</th>
						<th class="border border-gray-600 px-4 py-2 text-white text-sm">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each plotPoints as pp}
						<tr class="bg-gray-800">
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.title}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.description || ''}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.state}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.importance}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.reinforcement_count}</td>
							<td class="border border-gray-600 px-4 py-2 text-white">{pp.last_mentioned_turn ?? ''}</td>
							<td class="border border-gray-600 px-4 py-2">
								<button class="bg-blue-500 text-white px-2 py-1 rounded" onclick={() => editPlotPoint(pp)}>Edit</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if editingPlotPoint}
			<div class="mb-4 p-4 border border-gray-600 rounded bg-gray-800 text-white">
				<h3 class="text-lg font-semibold mb-2">Edit Plot Point</h3>
				<label class="block mb-2">
					Title: <input type="text" bind:value={editingPlotPoint.title} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Description: <textarea bind:value={editingPlotPoint.description} class="border border-gray-600 px-2 py-1 w-full bg-gray-700 text-white"></textarea>
				</label>
				<label class="block mb-2">
					State: 
					<select bind:value={editingPlotPoint.state} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white">
						<option value="candidate">Candidate</option>
						<option value="active">Active</option>
						<option value="fading">Fading</option>
						<option value="archived">Archived</option>
					</select>
				</label>
				<label class="block mb-2">
					Importance: <input type="number" bind:value={editingPlotPoint.importance} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Reinforcement Count: <input type="number" bind:value={editingPlotPoint.reinforcement_count} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<label class="block mb-2">
					Last Mentioned Turn: <input type="number" bind:value={editingPlotPoint.last_mentioned_turn} class="border border-gray-600 px-2 py-1 bg-gray-700 text-white" />
				</label>
				<button onclick={savePlotPoint} class="bg-green-500 text-white px-4 py-2 rounded mr-2">Save</button>
				<button onclick={deletePlotPoint} class="bg-red-500 text-white px-4 py-2 rounded mr-2">Delete</button>
				<button onclick={() => editingPlotPoint = null} class="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
			</div>
		{/if}
	{/if}
</div>