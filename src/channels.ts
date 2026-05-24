export type SourceKind = "ruv" | "syn";

export interface Channel {
  /** Our canonical id (used in tool args and cache keys). */
  id: string;
  /** Display name. */
  name: string;
  /** Broadcaster. */
  station: string;
  /** Which source adapter fetches this channel. */
  source: SourceKind;
  /** Upstream identifier (muninn dir name, or syn.is api slug). */
  slug: string;
}

/**
 * Phase 1 channels. RÚV via muninn XML and Sýn via the syn.is JSON API are the
 * confirmed-working feeds (verified 2026-05-23). `syn` and `synsport` are tested;
 * `synsport2/3/4` are documented but unverified. The Stöð 2-brand slugs
 * (stod2, stod2bio, ...) returned 504 from syn.is and are NOT included until the
 * correct slugs are discovered (sniff syn.is/sjonvarp/dagskra network calls).
 * Sjónvarp Símans is deliberately out of scope for now (no clean public feed).
 */
export const CHANNELS: Channel[] = [
  { id: "ruv", name: "RÚV", station: "RÚV", source: "ruv", slug: "ruv" },
  { id: "ruv2", name: "RÚV 2", station: "RÚV", source: "ruv", slug: "ruv2" },
  { id: "syn", name: "Sýn", station: "Sýn", source: "syn", slug: "syn" },
  { id: "synsport", name: "Sýn Sport", station: "Sýn", source: "syn", slug: "synsport" },
  { id: "synsport2", name: "Sýn Sport 2", station: "Sýn", source: "syn", slug: "synsport2" },
  { id: "synsport3", name: "Sýn Sport 3", station: "Sýn", source: "syn", slug: "synsport3" },
  { id: "synsport4", name: "Sýn Sport 4", station: "Sýn", source: "syn", slug: "synsport4" },
];

export function getChannel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id);
}
