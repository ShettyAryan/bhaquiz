import { randomInt } from "crypto";

export function pickUnique<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const n = Math.min(Math.max(count, 0), pool.length);
  const picked: T[] = [];
  for (let index = 0; index < n; index += 1) {
    const chosen = randomInt(pool.length);
    picked.push(pool.splice(chosen, 1)[0]);
  }
  return picked;
}
