export function turnsSince(lastTurn: number | null, current: number) {
  if (lastTurn == null) return Infinity;
  return current - lastTurn;
}

