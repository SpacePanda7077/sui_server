export function ANGLE_BETWEEN(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
): number {
  return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
}

export function DISTANCE_BETWEEN(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number },
): number {
  return Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
}

export function Normalize(x: number, y: number) {
  const length = Math.sqrt(x * x + y * y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}
