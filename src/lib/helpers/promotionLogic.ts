import { PROMOTION_RULES } from "$lib/constants/constants";

export function shouldPromotePlotPoint(pp: any) {
  return (
    pp.state === "candidate" &&
    (
      pp.reinforcement_count >= PROMOTION_RULES.reinforcement_required ||
      pp.importance >= PROMOTION_RULES.importance_required
    )
  );
}

export function shouldPromoteCharacter(c: any) {
  return (
    c.state === "candidate" &&
    (
      c.reinforcement_count >= PROMOTION_RULES.reinforcement_required ||
      c.importance >= PROMOTION_RULES.importance_required
    )
  );
}

export function shouldPromotePlace(p: any) {
  return (
    p.state === "candidate" &&
    p.reinforcement_count >= PROMOTION_RULES.reinforcement_required
  );
}


