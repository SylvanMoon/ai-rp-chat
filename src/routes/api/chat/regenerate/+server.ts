import { json } from '@sveltejs/kit';
import { generateResponse } from '$lib/server/openaiClient';
import {
	buildSystemPrompt,
	getLorebookData,
	getSessionLoreSnapshot
} from '$lib/helpers/lorebookManager';

// ------------------------------
// POST handler
// ------------------------------
export async function POST({ request }) {
	const { chatId, messages } = await request.json();

	if (!Array.isArray(messages)) {
		return json({ error: 'Invalid messages' }, { status: 400 });
	}

	try {
		// Get session snapshot
		const sessionData = chatId
			? await getSessionLoreSnapshot(chatId)
			: {
					characters: [],
					places: [],
					quests: [],
					plot_points: [],
					history: []
				};

		// Only fetch lorebook if session is empty
		// let lorebookData = null;
		// if (chatId && !sessionData.characters.length && !sessionData.places.length) {
		//     lorebookData = await getLorebookData(chatId);
		// }

		// Build system prompt
		const enhancedMessages = [...messages];
		if (enhancedMessages[0].role === 'system') {
			enhancedMessages[0].content = await buildSystemPrompt(
				enhancedMessages[0].content,
				sessionData,
				chatId
			);
		}

		// Generate AI response
		const completion = await generateResponse(enhancedMessages, {
			temperature: 0.9,
			top_p: 0.98,
			max_tokens: 2048,
			frequency_penalty: 0.15,
			presence_penalty: 0.1,
			stop: ['\nYou:', '\nUser:', '\n<USER>:']
		});

		const aiReply = completion.choices[0].message.content ?? '';

		return json({ option: aiReply });
	} catch (err) {
		console.error(err);
		return json({ error: 'AI regeneration failed' }, { status: 500 });
	}
}
