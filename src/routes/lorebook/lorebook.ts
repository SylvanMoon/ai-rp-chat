import { supabase } from '$lib/supabaseClient';

export async function loadAllLorebooks(allLorebooks: any[]) {
	const { data, error } = await supabase
		.from('lorebooks')
		.select('*');

	if (error) {
		console.error('Error loading lorebooks:', error);
		return;
	}

	allLorebooks.length = 0;
	allLorebooks.push(...(data || []));
}

export async function selectLorebook(lorebook: any, characters: any[], places: any[], quests: any[]) {
	await loadLorebookData(lorebook, characters, places, quests);
	return lorebook;
}

export async function createLorebook(event: Event, lorebookName: string, lorebookDescription: string, allLorebooks: any[]) {
	event.preventDefault();
	if (!lorebookName.trim()) return null;

	const { data, error } = await supabase
		.from('lorebooks')
		.insert([{ name: lorebookName, description: lorebookDescription }])
		.select()
		.single();

	if (error) {
		console.error('Error creating lorebook:', error);
		return null;
	}

	loadAllLorebooks(allLorebooks); // Refresh the list
	return data;
}

export async function loadLorebookData(currentLorebook: any, characters: any[], places: any[], quests: any[]) {
	if (!currentLorebook) return;

	// Load characters
	const { data: chars } = await supabase
		.from('lore_characters')
		.select('*')
		.eq('lorebook_id', currentLorebook.id);
	characters.length = 0;
	characters.push(...(chars || []));

	// Load places
	const { data: pls } = await supabase
		.from('lore_places')
		.select('*')
		.eq('lorebook_id', currentLorebook.id);
	places.length = 0;
	places.push(...(pls || []));

	// Load quests
	const { data: qsts } = await supabase
		.from('lore_quests')
		.select('*')
		.eq('lorebook_id', currentLorebook.id);
	quests.length = 0;
	quests.push(...(qsts || []));
}

export async function addCharacter(event: Event, newCharacterName: string, newCharacterDescription: string, newCharacterRelationships: string, newCharacterAliases: string, currentLorebook: any, characters: any[]) {
	event.preventDefault();
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

	characters.push(data);
}

export async function addPlace(event: Event, newPlaceName: string, newPlaceDescription: string, currentLorebook: any, places: any[]) {
	event.preventDefault();
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

	places.push(data);
}

export async function addQuest(event: Event, newQuestDescription: string, newQuestCharacters: string, currentLorebook: any, quests: any[]) {
	event.preventDefault();
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

	quests.push(data);
}

export async function updateCharacter(event: Event, editingCharacter: any, characters: any[]) {
	event.preventDefault();
	if (!editingCharacter) return;

	const relationships = editingCharacter.relationships ? (typeof editingCharacter.relationships === 'string' ? JSON.parse(editingCharacter.relationships) : editingCharacter.relationships) : {};
	const aliases = editingCharacter.aliases ? (typeof editingCharacter.aliases === 'string' ? JSON.parse(editingCharacter.aliases) : editingCharacter.aliases) : [];

	const { error } = await supabase
		.from('lore_characters')
		.update({
			name: editingCharacter.name,
			description: editingCharacter.description,
			relationships,
			aliases
		})
		.eq('id', editingCharacter.id);

	if (error) {
		console.error('Error updating character:', error);
		return;
	}

	const index = characters.findIndex(c => c.id === editingCharacter.id);
	if (index !== -1) {
		characters[index] = editingCharacter;
	}
}

export async function deleteCharacter(char: any, characters: any[]) {
	if (!confirm(`Are you sure you want to delete character "${char.name}"?`)) return;

	const { error } = await supabase
		.from('lore_characters')
		.delete()
		.eq('id', char.id);

	if (error) {
		console.error('Error deleting character:', error);
		return;
	}

	const index = characters.findIndex(c => c.id === char.id);
	if (index !== -1) {
		characters.splice(index, 1);
	}
}

export async function updatePlace(event: Event, editingPlace: any, places: any[]) {
	event.preventDefault();
	if (!editingPlace) return;

	const { error } = await supabase
		.from('lore_places')
		.update({
			name: editingPlace.name,
			description: editingPlace.description
		})
		.eq('id', editingPlace.id);

	if (error) {
		console.error('Error updating place:', error);
		return;
	}

	const index = places.findIndex(p => p.id === editingPlace.id);
	if (index !== -1) {
		places[index] = editingPlace;
	}
}

export async function deletePlace(place: any, places: any[]) {
	if (!confirm(`Are you sure you want to delete place "${place.name}"?`)) return;

	const { error } = await supabase
		.from('lore_places')
		.delete()
		.eq('id', place.id);

	if (error) {
		console.error('Error deleting place:', error);
		return;
	}

	const index = places.findIndex(p => p.id === place.id);
	if (index !== -1) {
		places.splice(index, 1);
	}
}

export async function updateQuest(event: Event, editingQuest: any, quests: any[]) {
	event.preventDefault();
	if (!editingQuest) return;

	const involvedCharacters = editingQuest.involved_characters ? (typeof editingQuest.involved_characters === 'string' ? JSON.parse(editingQuest.involved_characters) : editingQuest.involved_characters) : [];

	const { error } = await supabase
		.from('lore_quests')
		.update({
			description: editingQuest.description,
			involved_characters: involvedCharacters
		})
		.eq('id', editingQuest.id);

	if (error) {
		console.error('Error updating quest:', error);
		return;
	}

	const index = quests.findIndex(q => q.id === editingQuest.id);
	if (index !== -1) {
		quests[index] = editingQuest;
	}
}

export async function deleteQuest(quest: any, quests: any[]) {
	if (!confirm(`Are you sure you want to delete this quest?`)) return;

	const { error } = await supabase
		.from('lore_quests')
		.delete()
		.eq('id', quest.id);

	if (error) {
		console.error('Error deleting quest:', error);
		return;
	}

	const index = quests.findIndex(q => q.id === quest.id);
	if (index !== -1) {
		quests.splice(index, 1);
	}
}