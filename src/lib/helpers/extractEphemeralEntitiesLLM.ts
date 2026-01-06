// ------------------------------
// Helper: Extract ephemeral entities using LLM

import { client } from "$lib/server/openaiClient";

// ------------------------------
export async function extractEphemeralEntitiesLLM(recentMessages: { role: string; content: string }[]) {
    if (!recentMessages.length) return null;

    // Build a single string for context
    const conversation = recentMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const systemPrompt = `
You are a Game Master assistant.

Your task is to extract **all new ephemeral entities** mentioned in the conversation.

Ephemeral entities include:

- Characters:
  Named individuals introduced for the first time.
  Include name and a brief description only if explicitly stated.

- Places:
  Named locations introduced for the first time.

- Quests:
  Explicit objectives, missions, or goals that require future action.

- Plot points:
  Ongoing story elements that persist beyond the current scene.
  Include unresolved conflicts, secrets, plans, or threats that would still matter later.

- History events:
  Completed past actions or incidents that have already occurred and are not ongoing.

IMPORTANT:
Only extract entities that are NEW and not already present in the session.
Output JSON only, in this exact format:
{
  "characters": [{"name": "...", "description": "..."}],
  "places": [{"name": "...", "description": "..."}],
  "quests": [{"title": "...", "description": "..."}],
  "plot_points": [{"notes": "..."}],
  "events": [{"summary": "..."}]
}

Examples:
- If someone says "I meet a mysterious elf named Elara in the tavern", extract character: {"name": "Elara", "description": "mysterious elf"}
- If someone mentions "the ancient ruins of Eldoria", extract place: {"name": "Eldoria", "description": "ancient ruins"}
- If there's a quest to "find the lost artifact", extract quest: {"title": "Find the Lost Artifact", "description": "Locate and retrieve the lost artifact"}

Do not output explanations, commentary, or plain text.
`;

    let reply = '';
    try {
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: conversation }
            ],
            temperature: 0,
            max_tokens: 1024
        });

        reply = completion.choices[0].message.content ?? '';
        console.log("--------------------------------------")
        console.log("Raw LLM response for ephemeral extraction:", reply);

        // Extract JSON from markdown code block if present
        let jsonString = reply.trim();

        // Try to extract JSON from code blocks
        const jsonBlockMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonBlockMatch) {
            jsonString = jsonBlockMatch[1];
        } else if (jsonString.startsWith('```')) {
            // Remove any code block markers
            jsonString = jsonString.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        // Try to find JSON object in the response
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        // Clean up and validate we have content
        jsonString = jsonString.trim();

        if (!jsonString || jsonString.length === 0) {
            console.log("No JSON found in LLM response");
            return null;
        }

        // Attempt to parse JSON
        const parsed = JSON.parse(jsonString);
        console.log("--------------------------------------")
        console.log("Successfully parsed ephemeral entities:", parsed);
        return parsed;
    } catch (err) {
        console.error("Failed to extract ephemeral entities:", err);
        console.error("Attempted to parse:", reply?.substring(0, 500));
        return null;
    }
}