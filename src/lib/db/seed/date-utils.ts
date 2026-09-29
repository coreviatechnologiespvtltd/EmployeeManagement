function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toISODateTime(d: Date): string {
  return d.toISOString();
}

/** Deterministic PRNG so seeded data is stable within a single boot. */
export function makeRandom(seed: number) {
  let state = seed;
  return function random(): number {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function shiftDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function shiftMonths(base: Date, months: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth() + months, 1);
  return d;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export { toISODate, toISODateTime };
