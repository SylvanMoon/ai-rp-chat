import { supabase } from '$lib/client/supabaseClient';
import { decayCharacter, decayPlace, decayPlotPoint } from './decayLogic';
import { shouldPromoteCharacter, shouldPromotePlace, shouldPromotePlotPoint } from './promotionLogic';
import { updateSessionCharacter } from './sessionCharacterManager';
import { updateSessionPlace } from './sessionPlaceManager';
import { updateSessionPlotPoint } from './sessionPlotPointsManager';
import { turnsSince } from './turnsSince';

export async function runPromotionAndDecay(chatId: string, currentAssistantTurn: number) {

  // ---------------- Plot Points ----------------
  {
    const { data: plotPoints } = await supabase
      .from("session_plot_points")
      .select("*")
      .eq("chat_id", chatId)
      .not("state", "in", '("resolved","archived")');

    for (const pp of plotPoints ?? []) {
      const turnsIdle = pp.last_mentioned_turn == null
        ? 0
        : turnsSince(pp.last_mentioned_turn, currentAssistantTurn);

      const promote = shouldPromotePlotPoint(pp);
      const decayed = decayPlotPoint(pp, turnsIdle);

      const updatePayload: any = {};

      if (promote && pp.state !== "active") {
        updatePayload.state = "active";
        console.log(`[PROMOTE] Plot Point: ${pp.title}`);
      } 
      else if (decayed && pp.state !== decayed) {
        updatePayload.state = decayed;
        console.log(`[DECAY] Plot Point: ${pp.title} → ${decayed}`);
      }

      if (Object.keys(updatePayload).length > 0) {
        await updateSessionPlotPoint(pp.id, updatePayload);
      }
    }
  }

  // ---------------- Characters ----------------
  {
    const { data: characters } = await supabase
      .from("session_characters")
      .select("*")
      .eq("chat_id", chatId)
      .not("state", "in", '("archived")');

    for (const c of characters ?? []) {
      const turnsIdle = c.last_mentioned_turn == null
        ? 0
        : turnsSince(c.last_mentioned_turn, currentAssistantTurn);

      const promote = shouldPromoteCharacter(c);
      const decayed = decayCharacter(c, turnsIdle);

      const updatePayload: any = {};

      if (promote && c.state !== "active") {
        updatePayload.state = "active";
        console.log(`[PROMOTE] Character: ${c.name}`);
      } 
      else if (decayed && c.state !== decayed) {
        updatePayload.state = decayed;
        console.log(`[DECAY] Character: ${c.name} → ${decayed}`);
      }

      if (Object.keys(updatePayload).length > 0) {
        await updateSessionCharacter(c.id, updatePayload);
      }
    }
  }

  // ---------------- Places ----------------
  {
    const { data: places } = await supabase
      .from("session_places")
      .select("*")
      .eq("chat_id", chatId)
      .not("state", "in", '("archived")');

    for (const p of places ?? []) {
      const turnsIdle = p.last_mentioned_turn == null
        ? 0
        : turnsSince(p.last_mentioned_turn, currentAssistantTurn);

      const promote = shouldPromotePlace(p);
      const decayed = decayPlace(p, turnsIdle);

      const updatePayload: any = {};

      if (promote && p.state !== "active") {
        updatePayload.state = "active";
        console.log(`[PROMOTE] Place: ${p.name}`);
      } 
      else if (decayed && p.state !== decayed) {
        updatePayload.state = decayed;
        console.log(`[DECAY] Place: ${p.name} → ${decayed}`);
      }

      if (Object.keys(updatePayload).length > 0) {
        await updateSessionPlace(p.id, updatePayload);
      }
    }
  }
}
