import { json } from "@sveltejs/kit";
import { client } from '$lib/server/openaiClient';
import { supabase } from '$lib/client/supabaseClient';
import { buildSystemPrompt, getSessionLoreSnapshot } from "$lib/helpers/lorebookManager";
import { extractEphemeralEntitiesLLM, syncEphemeralEntitiesToSession } from "$lib/helpers/extractAndInsertEphemeralData";
import { getMessagesSinceLastHistory, getMessagesSinceLastUser, saveMessage } from "$lib/helpers/messageManager";
import { summarizeSessionHistory } from "$lib/helpers/sessionManager";
import { runPromotionAndDecay } from "$lib/helpers/runPromotionAndDecay";

const SUMMARY_THRESHOLD = 20;

// ------------------------------
// POST handler
// ------------------------------
export async function POST({ request }) {
    const { chatId, messages } = await request.json();

    if (!chatId || !Array.isArray(messages)) {
        return json({ error: "Missing chatId or invalid messages" }, { status: 400 });
    }

    try {
        // Save latest user message
        const userMessage = messages[messages.length - 1];
        console.log("--------------------------------------")
        console.log("Latest user message:", userMessage);

        if (userMessage.role === "user") {
            await saveMessage(chatId, "user", userMessage.content);

            // ------------------------------
            // Only after a user message:
            // Extract ephemeral entities from recent messages
            // ------------------------------
            const recentMessages = await getMessagesSinceLastUser(chatId); // include user + AI
            console.log("--------------------------------------")
            console.log("Recent messages for ephemeral extraction:", recentMessages);
            const ephemeralData = await extractEphemeralEntitiesLLM(recentMessages, chatId);

            if (ephemeralData) {
                await syncEphemeralEntitiesToSession(chatId, ephemeralData);

                // Get current assistant turn
                const { data: chat } = await supabase
                    .from("chats")
                    .select("assistant_turn")
                    .eq("id", chatId)
                    .single();
                const currentAssistantTurn = chat?.assistant_turn ?? 0;

                await runPromotionAndDecay(chatId, currentAssistantTurn);
            }

            // ------------------------------
            // Check if we should summarize
            // ------------------------------
            // const messagesSinceLastHistory = await getMessagesSinceLastHistory(chatId);
            // if (messagesSinceLastHistory.length >= SUMMARY_THRESHOLD) {
            //     console.log("--------------------------------------")
            //     console.log(`Generating session summary for ${messagesSinceLastHistory.length} messages`);
            //     await summarizeSessionHistory(chatId, messagesSinceLastHistory);
            // }
        }

        // Get session snapshot for system prompt
        const sessionLoreData = await getSessionLoreSnapshot(chatId);
        console.log("--------------------------------------")
        console.log("sessionLoreData:", sessionLoreData);


        const enhancedMessages = [...messages];
        console.log("--------------------------------------")
        console.log("enhancedMessages:", enhancedMessages);
        if (enhancedMessages[0].role === 'system') {
            enhancedMessages[0].content = await buildSystemPrompt(enhancedMessages[0].content, sessionLoreData, chatId, null);
        }

        // Log the full prompt being sent to LLM
        console.log("--------------------------------------")
        console.log("Full prompt being sent to LLM:", JSON.stringify(enhancedMessages, null, 2));

        // Generate AI response
        const completion = await client.chat.completions.create({
            model: "deepseek-ai/deepseek-r1",
            messages: enhancedMessages,
            temperature: 0.9,
            top_p: 0.98,
            max_tokens: 2048,
            frequency_penalty: 0.15,
            presence_penalty: 0.1,
            stop: [
                "\nYou:",
                "\nUser:",
                "\n<USER>:"
            ]
        });

        const aiReply = completion.choices[0].message.content ?? "";

        // Save AI response
        await saveMessage(chatId, "assistant", aiReply);

        return json({ reply: aiReply });
    } catch (err) {
        console.error(err);
        return json({ error: "AI request failed" }, { status: 500 });
    }
}
