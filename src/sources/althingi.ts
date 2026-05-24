import { XMLParser } from "fast-xml-parser";
import type { Channel } from "../channels.js";
import type { Program } from "../schema.js";

// Official parliamentary agenda feed (the parliament's own site, not an aggregator).
const FEED_URL = "https://www.althingi.is/altext/xml/dagskra/";

// The feed is ISO-8859-1 and has Icelandic element names (<dagsetning>, <tími>, ...).
const parser = new XMLParser({ ignoreAttributes: true });

function asArray<T>(v: T | T[] | undefined | null): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

/** "26.5.2026" + "kl. 13:30" (Icelandic local = UTC) -> ISO 8601 UTC, or null. */
function toIso(dagsetning: string, timi: string): string | null {
  const d = dagsetning.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!d) return null;
  const t = timi.match(/(\d{1,2}):(\d{2})/);
  const pad = (s: string) => s.padStart(2, "0");
  const [, day, month, year] = d;
  const hh = t ? pad(t[1]) : "00";
  const mm = t ? t[2] : "00";
  return `${year}-${pad(month)}-${pad(day)}T${hh}:${mm}:00Z`;
}

/** Fetch the Alþingi agenda feed (decoding its Latin-1 payload). */
export async function fetchAlthingi(channel: Channel): Promise<Program[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`Alþingi: HTTP ${res.status}`);
  const xml = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
  return parseAlthingi(xml, channel);
}

export function parseAlthingi(xml: string, channel: Channel): Program[] {
  const doc = parser.parse(xml) as { textavarp?: { fundur?: unknown } };
  const out: Program[] = [];
  for (const f of asArray(doc.textavarp?.fundur) as Array<Record<string, unknown>>) {
    const start = toIso(String(f["dagsetning"] ?? ""), String(f["tími"] ?? ""));
    if (!start) continue;
    const agenda = asArray(f["dagskrárliður"] as unknown)
      .map((li) => {
        const item = li as Record<string, unknown>;
        return `${item["númer"]}. ${item["heiti"]}`.trim();
      })
      .filter((s) => s !== ".");
    const num = f["fundarnúmer"] ? ` – ${String(f["fundarnúmer"]).trim()}` : "";
    out.push({
      channel: channel.id,
      station: channel.station,
      start,
      // Parliamentary sittings have no scheduled end time.
      end: start,
      title: `Þingfundur${num}`,
      description: agenda.join("; ") || undefined,
      category: "Þingfundur",
    });
  }
  return out;
}
