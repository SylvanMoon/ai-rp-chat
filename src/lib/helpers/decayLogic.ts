import { TURN_THRESHOLDS } from "$lib/constants/constants";

export function decayPlotPoint(pp: any, turnsIdle: number) {
  if (pp.state === "active" && turnsIdle >= TURN_THRESHOLDS.plot_point.fade_after) {
    return "fading";
  }
  if (pp.state === "fading" && turnsIdle >= TURN_THRESHOLDS.plot_point.archive_after) {
    return "archived";
  }
  return null;
}

export function decayCharacter(c: any, turnsIdle: number) {
  if (c.state === "active" && turnsIdle >= TURN_THRESHOLDS.character.inactive_after) {
    return "inactive";
  }
  if (c.state === "inactive" && turnsIdle >= TURN_THRESHOLDS.character.archive_after) {
    return "archived";
  }
  return null;
}

export function decayPlace(p: any, turnsIdle: number) {
  if (p.state === "active" && turnsIdle >= TURN_THRESHOLDS.place.archive_after) {
    return "archived";
  }
  return null;
}


