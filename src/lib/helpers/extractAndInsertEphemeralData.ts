// ------------------------------
// Helper: Extract ephemeral entities using LLM

import { generateResponse } from "$lib/server/openaiClient";
import { supabase } from '$lib/client/supabaseClient';

export type SessionCharacter = { id?: string; name: string; description?: string | null };
export type SessionPlace = { id?: string; name: string; description?: string | null };
export type SessionPlotPoint = { id?: string; title: string; description?: string | null };

type ExtractedEntities = {
    characters?: { name: string; description?: string | null }[];
    places?: { name: string; description?: string | null }[];
    plot_points?: { title: string; description?: string | null }[];
};


export async function extractEphemeralEntitiesLLM(
    recentMessages: { role: string; content: string }[],
    chatId: string
) {
    if (!recentMessages.length) return null;

    // 1️⃣ Fetch existing session data for this chat
    const [
        { data: characters = [] },
        { data: places = [] },
        { data: plot_points = [] }
    ] = await Promise.all([
        supabase.from("session_characters").select("name, description").eq("chat_id", chatId),
        supabase.from("session_places").select("name, description").eq("chat_id", chatId),
        supabase.from("session_plot_points").select("title, description").eq("chat_id", chatId)
    ]);

    // 2️⃣ Build conversation context
    const conversation = recentMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    // 3️⃣ Existing session data for LLM awareness
    const existingDataJson = JSON.stringify({
        characters: characters?.map(c => ({ name: c.name, description: c.description ?? "" })),
        places: places?.map(p => ({ name: p.name, description: p.description ?? "" })),
        plot_points: plot_points?.map(pp => ({ title: pp.title, description: pp.description ?? "" }))
    });

    // 4️⃣ System prompt
    const systemPrompt = `
You are a Game Master assistant.

Your task is to extract **all new or updated ephemeral entities** mentioned in the conversation.

Ephemeral entities include:

- Characters: named individuals introduced for the first time, or existing characters with new information (renames, revealed identities, new roles, etc.)
- Places: named locations introduced for the first time, or existing places with new details
- Plot points: ongoing story elements (unresolved conflicts, secrets, plans, or threats), including updates to existing plot points

Existing entities (do not duplicate unless new info is present):
${existingDataJson}

Output JSON only in this exact format:
{
  "characters": [{"name": "...", "description": "..."}],
  "places": [{"name": "...", "description": "..."}],
  "plot_points": [{"title": "...", "description": "..."}]
}

Do not output explanations, commentary, or plain text. Ensure the JSON is complete and valid.
`;

    console.log("--------------------------------------");
    console.log("Ephemeral Extraction System Prompt:", systemPrompt);

    let reply = "";

    try {
        // 5️⃣ Call LLM
        const completion = await generateResponse([
            { role: "system", content: systemPrompt },
            { role: "user", content: conversation }
        ], {
            temperature: 0,
            max_tokens: 2048
        });

        reply = completion.choices[0].message.content ?? "";
        console.log("--------------------------------------");
        console.log("Raw LLM response:", reply);

    } catch (err) {
        console.error("LLM extraction call failed:", err);
        return null;
    }

    // 6️⃣ Normalize output (strip backticks / code fences)
    let cleaned = reply
        .replace(/```json/gi, "")
        .replace(/```json|```/gi, "")
        .replace(/```/g, "")
        .replace(/`/g, "")
        .trim();
    console.log("--------------------------------------");
    console.log("Cleaned LLM response:", cleaned);

    // 7️⃣ Extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.warn("No JSON detected. Returning empty entities.");
        return { characters: [], places: [], plot_points: [] };
    }

    try {

        const parsed = JSON.parse(jsonMatch[0]) as {
            characters?: { name?: string; description?: string }[];
            places?: { name?: string; description?: string }[];
            plot_points?: { title?: string; description?: string }[];
        };

        // 8️⃣ Normalize + sanitize output
        return {
            characters: (parsed.characters ?? [])
                .filter(c => c.name && c.name.trim())
                .map(c => ({
                    name: c.name!.trim(),
                    description: c.description?.trim() ?? null
                })),

            places: (parsed.places ?? [])
                .filter(p => p.name && p.name.trim())
                .map(p => ({
                    name: p.name!.trim(),
                    description: p.description?.trim() ?? null
                })),

            plot_points: (parsed.plot_points ?? [])
                .filter(pp => pp.title && pp.title.trim())
                .map(pp => ({
                    title: pp.title!.trim(),
                    description: pp.description?.trim() ?? null
                }))
        };

    } catch (err) {
        console.error("Failed to parse extracted JSON");
        console.error("Raw LLM response:", reply);
        console.error("Cleaned JSON:", cleaned);
        return null;
    }
}

//-------------------------------
// Sync extracted ephemeral entities to session
//-------------------------------
export async function syncEphemeralEntitiesToSession(
    chatId: string,
    extracted: ExtractedEntities
) {
    const now = new Date().toISOString();

    // ---------- CHARACTERS ----------
    if (extracted.characters?.length) {
        const { data: allChars } = await supabase
            .from("session_characters")
            .select("id, name, description, reinforcement_count")
            .eq("chat_id", chatId);

        for (const char of extracted.characters) {
            const normalized = normalizeName(char.name);
            let existing = null;

            for (const c of allChars ?? []) {
                const score = similarity(normalizeName(c.name), normalized);
                if (score > 0.8) {
                    existing = c;
                    break;
                }
            }

            if (existing) {
                await supabase
                    .from("session_characters")
                    .update({
                        description: char.description,
                        reinforcement_count: (existing.reinforcement_count ?? 1) + 1,
                        last_mentioned: now
                    })
                    .eq("id", existing.id);
            } else {
                await supabase.from("session_characters").insert({
                    chat_id: chatId,
                    name: char.name,
                    description: char.description,
                    state: "candidate",
                    importance: 1,
                    reinforcement_count: 1,
                    last_mentioned: now
                });
            }
        }
    }


    // ---------- PLACES ----------
    if (extracted.places?.length) {
        for (const place of extracted.places) {
            const { data: existing } = await supabase
                .from("session_places")
                .select("id, reinforcement_count")
                .eq("chat_id", chatId)
                .ilike("name", place.name)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from("session_places")
                    .update({
                        description: place.description,
                        reinforcement_count: (existing.reinforcement_count ?? 1) + 1,
                        last_mentioned: now
                    })
                    .eq("id", existing.id);
            } else {
                await supabase.from("session_places").insert({
                    chat_id: chatId,
                    name: place.name,
                    description: place.description,
                    state: "candidate",
                    importance: 1,
                    reinforcement_count: 1,
                    last_mentioned: now
                });
            }
        }
    }

    // ---------- PLOT POINTS ----------
    if (extracted.plot_points?.length) {
        for (const plot of extracted.plot_points) {
            const { data: existing } = await supabase
                .from("session_plot_points")
                .select("id, reinforcement_count")
                .eq("chat_id", chatId)
                .ilike("title", plot.title)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from("session_plot_points")
                    .update({
                        description: plot.description,
                        reinforcement_count: (existing.reinforcement_count ?? 1) + 1,
                        last_mentioned: now
                    })
                    .eq("id", existing.id);
            } else {
                await supabase.from("session_plot_points").insert({
                    chat_id: chatId,
                    title: plot.title,
                    description: plot.description,
                    state: "candidate",
                    importance: 1,
                    reinforcement_count: 1,
                    last_mentioned: now
                });
            }
        }
    }
}

function normalizeName(name: string) {
    return name.toLowerCase().replace(/[^a-z]/g, "");
}

function similarity(a: string, b: string) {
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
}


//     const systemPrompt = `
// You are a Game Master assistant.

// Your task is to extract **all new or updated ephemeral entities** mentioned in the conversation.

// Ephemeral entities include:

// - Characters: named individuals introduced for the first time, or existing characters with new information (renames, revealed identities, new roles, etc.)
// - Places: named locations introduced for the first time, or existing places with new details
// - Plot points: ongoing story elements (unresolved conflicts, secrets, plans, or threats), including updates to existing plot points

// Existing entities (do not duplicate unless new info is present):
// ${existingDataJson}

// Output JSON only in this exact format:
// {
//   "characters": [{"name": "...", "description": "..."}],
//   "places": [{"name": "...", "description": "..."}],
//   "plot_points": [{"title": "...", "description": "..."}]
// }

// Do not output explanations, commentary, or plain text.
// `;