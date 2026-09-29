/**
 * Simulated network latency. Keeps loading states and skeletons honest during
 * development. Delete this file's usage when services call a real backend.
 */
const BASE_DELAY_MS = 180;

export async function simulateLatency(ms: number = BASE_DELAY_MS): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
