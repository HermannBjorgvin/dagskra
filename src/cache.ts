import { CHANNELS, getChannel } from "./channels.js";
import type { Env } from "./env.js";
import type { Program } from "./schema.js";
import { fetchRuv } from "./sources/ruv.js";
import { fetchSyn } from "./sources/syn.js";

const ON_MISS_TTL = 60 * 60 * 6; // 6h for fetch-on-miss writes
const REFRESH_TTL = 60 * 60 * 24 * 3; // 3d for cron-warmed entries

const keyOf = (channelId: string, date: string) => `schedule:${channelId}:${date}`;

/** Today's date (YYYY-MM-DD) in Icelandic time (= UTC). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The next `days` dates starting today (channels publish a few days ahead). */
export function forwardDates(days: number): string[] {
  const base = Date.now();
  return Array.from({ length: days }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Fetch directly from the upstream source for one channel/day. */
export async function fetchChannelDate(channelId: string, date: string): Promise<Program[]> {
  const ch = getChannel(channelId);
  if (!ch) throw new Error(`Unknown channel: ${channelId}`);
  const programs = ch.source === "ruv" ? await fetchRuv(ch, date, date) : await fetchSyn(ch, date);
  return programs.filter((p) => p.start.startsWith(date)).sort((a, b) => a.start.localeCompare(b.start));
}

/** Read a channel/day from cache, falling back to a live fetch on miss. */
export async function getSchedule(env: Env, channelId: string, date: string): Promise<Program[]> {
  const cached = await env.SCHEDULE_CACHE.get<Program[]>(keyOf(channelId, date), "json");
  if (cached) return cached;
  const fresh = await fetchChannelDate(channelId, date);
  await env.SCHEDULE_CACHE.put(keyOf(channelId, date), JSON.stringify(fresh), {
    expirationTtl: ON_MISS_TTL,
  });
  return fresh;
}

/** Cron job: warm the cache for every channel across the forward window. */
export async function refreshAll(env: Env, days = 5): Promise<void> {
  const dates = forwardDates(days);
  await Promise.allSettled(
    CHANNELS.flatMap((ch) =>
      dates.map(async (date) => {
        const programs = await fetchChannelDate(ch.id, date);
        await env.SCHEDULE_CACHE.put(keyOf(ch.id, date), JSON.stringify(programs), {
          expirationTtl: REFRESH_TTL,
        });
      }),
    ),
  );
}
