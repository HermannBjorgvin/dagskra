import type { Channel } from "../channels.js";
import type { Program } from "../schema.js";
import { addDuration } from "./ruv.js";

/** Raw record from https://www.syn.is/api/epg/{slug}[/{date}] (Icelandic field names). */
export interface SynItem {
  upphaf: string; // start, ISO 8601 UTC
  slotlengd?: string; // duration "HH:MM"
  titill?: string; // programme/international title
  isltitill?: string; // Icelandic (series) title
  undirtitill?: string; // subtitle / episode title
  lysing?: string; // full description
  seria?: number;
  thattur?: number;
  thattafjoldi?: number;
  beint?: number; // live (0/1)
  frumsyning?: number; // premiere (0/1)
  flokkur?: string; // category
  ar?: string | number; // year
  bannad?: string; // rating, e.g. "Green"
}

/** Fetch one day of a Sýn-family channel from the syn.is JSON API. */
export async function fetchSyn(channel: Channel, date: string): Promise<Program[]> {
  const url = `https://www.syn.is/api/epg/${channel.slug}/${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sýn ${channel.slug} ${date}: HTTP ${res.status}`);
  return parseSyn((await res.json()) as SynItem[], channel);
}

export function parseSyn(items: SynItem[], channel: Channel): Program[] {
  return items.map((it) => {
    const title = it.isltitill || it.titill || "(óþekkt)";
    return {
      channel: channel.id,
      station: channel.station,
      start: it.upphaf,
      end: it.slotlengd ? addDuration(it.upphaf, it.slotlengd) : it.upphaf,
      title,
      originalTitle: it.titill && it.titill !== title ? it.titill : undefined,
      description: it.lysing || it.undirtitill || undefined,
      category: it.flokkur || undefined,
      series:
        it.seria || it.thattur
          ? { season: it.seria || undefined, episode: it.thattur || undefined, total: it.thattafjoldi || undefined }
          : undefined,
      live: it.beint ? true : undefined,
      premiere: it.frumsyning ? true : undefined,
      rating: it.bannad || undefined,
    };
  });
}
