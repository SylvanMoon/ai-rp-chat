import { supabase } from '$lib/client/supabaseClient';
import { decayCharacter, decayPlace, decayPlotPoint } from './decayLogic';
import { shouldPromoteCharacter, shouldPromotePlace, shouldPromotePlotPoint } from './promotionLogic';
import { updateSessionCharacter } from './sessionCharacterManager';
import { updateSessionPlace } from './sessionPlaceManager';
import { updateSessionPlotPoint } from './sessionPlotPointsManager';

export async function runPromotionAndDecay(chatId: string, currentAssistantTurn: number) {
 
    // ---------------- Plot Points ----------------
  {
    const { data: plotPoints } = await supabase
      .from("session_plot_points")
      .select("*")
      .eq("chat_id", chatId)
      .not("state", "in", '("resolved","archived")');

    for (const pp of plotPoints ?? []) {
      const turnsIdle = turnsSince(pp.last_mentioned_turn, currentAssistantTurn);

      if (shouldPromotePlotPoint(pp)) {
        await updateSessionPlotPoint(pp.id, { state: "active" });
        continue;
      }

      const decayed = decayPlotPoint(pp, turnsIdle);
      if (decayed) {
        await updateSessionPlotPoint(pp.id, { state: decayed });
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
      const turnsIdle = turnsSince(c.last_mentioned_turn, currentAssistantTurn);

      if (shouldPromoteCharacter(c)) {
        await updateSessionCharacter(c.id, { state: "active" });
        continue;
      }

      const decayed = decayCharacter(c, turnsIdle);
      if (decayed) {
        await updateSessionCharacter(c.id, { state: decayed });
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
      const turnsIdle = turnsSince(p.last_mentioned_turn, currentAssistantTurn);

      if (shouldPromotePlace(p)) {
        await updateSessionPlace(p.id, { state: "active" });
        continue;
      }

      const decayed = decayPlace(p, turnsIdle);
      if (decayed) {
        await updateSessionPlace(p.id, { state: decayed });
      }
    }
  }
}
