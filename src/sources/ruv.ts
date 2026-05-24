import { XMLParser } from "fast-xml-parser";
import type { Channel } from "../channels.js";
import type { Program } from "../schema.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
});

/** "2026-05-23 07:00:00" (Icelandic local = UTC) -> ISO 8601 UTC. */
function toIso(local: string): string {
  return local.trim().replace(" ", "T") + "Z";
}

/** Add an "HH:MM:SS" (or "HH:MM") duration to an ISO time, returning ISO UTC. */
export function addDuration(startIso: string, dur: string): string {
  const [h = 0, m = 0, s = 0] = dur.split(":").map(Number);
  const ms = ((h * 60 + m) * 60 + s) * 1000;
  return new Date(new Date(startIso).getTime() + ms).toISOString().replace(".000Z", "Z");
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
/** Text content from a node that may be a string, or an object with #text. */
function txt(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") return String((v as Record<string, unknown>)["#text"] ?? "").trim();
  return String(v).trim();
}
/** Text from a node that may hold a CDATA section. */
function cdataText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return String(o["__cdata"] ?? o["#text"] ?? "").trim();
  }
  return String(v).trim();
}

/** Fetch RÚV's official schedule XML for an inclusive date range. */
export async function fetchRuv(channel: Channel, from: string, to: string): Promise<Program[]> {
  const url = `https://muninn.ruv.is/files/xml/${channel.slug}/${from}/${to}/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RÚV ${channel.slug} ${from}..${to}: HTTP ${res.status}`);
  return parseRuv(await res.text(), channel);
}

export function parseRuv(xml: string, channel: Channel): Program[] {
  const doc = parser.parse(xml) as { schedule?: { service?: unknown } };
  const out: Program[] = [];
  for (const svc of asArray(doc.schedule?.service) as Array<Record<string, unknown>>) {
    for (const ev of asArray(svc.event) as Array<Record<string, unknown>>) {
      const start = toIso(String(ev["@_start-time"]));
      const details = (ev.details ?? {}) as Record<string, unknown>;
      const ep = ev.episode as Record<string, string> | undefined;
      const episode = ep?.["@_number"] ? Number(ep["@_number"]) : undefined;
      const total = ep?.["@_number-of-episodes"] ? Number(ep["@_number-of-episodes"]) : undefined;
      out.push({
        channel: channel.id,
        station: channel.station,
        start,
        end: addDuration(start, String(ev["@_duration"] ?? "00:00:00")),
        title: txt(ev.title) || "(óþekkt)",
        originalTitle: txt(ev["original-title"]) || undefined,
        description:
          cdataText(ev.description) ||
          txt(details["episode-description"]) ||
          txt(details["series-description"]) ||
          undefined,
        category: txt(ev.category) || undefined,
        series: episode || total ? { episode, total } : undefined,
        live: txt(ev.live) === "yes" || undefined,
        // RÚV's feed has no premiere flag, but it does mark repeats via <rerun>.
        rerun: txt(ev.rerun) === "yes" || undefined,
        rating: txt(ev.rating) || undefined,
      });
    }
  }
  return out;
}
