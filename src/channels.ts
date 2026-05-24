export type SourceKind = "ruv" | "syn" | "althingi";

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
 * Channels, all verified against live feeds (2026-05-24):
 * - RÚV via muninn XML: `ruv`, `ruv2`.
 * - Sýn via the syn.is JSON API: `syn` and `synsport`..`synsport5`.
 *
 * Sýn hf. rebranded its "Stöð 2 Sport" tier to "Sýn Sport", and the flagship
 * general-entertainment feed is published under slug `syn`. There are no `stod2*`
 * EPG slugs — those requests hang on the upstream (not a 404). The premium Stöð 2
 * channels (Bíó/Gull/Fjölskylda) and Sjónvarp Símans have no public EPG feed, so
 * they are out of scope.
 *
 * Alþingi (parliament TV) publishes its session agenda as official XML on
 * althingi.is; it broadcasts on RÚV 2 when in session. Its "schedule" is sparse
 * (typically the next sitting), not a full-day EPG.
 */
export const CHANNELS: Channel[] = [
  { id: "ruv", name: "RÚV", station: "RÚV", source: "ruv", slug: "ruv" },
  { id: "ruv2", name: "RÚV 2", station: "RÚV", source: "ruv", slug: "ruv2" },
  { id: "syn", name: "Sýn", station: "Sýn", source: "syn", slug: "syn" },
  { id: "synsport", name: "Sýn Sport", station: "Sýn", source: "syn", slug: "synsport" },
  { id: "synsport2", name: "Sýn Sport 2", station: "Sýn", source: "syn", slug: "synsport2" },
  { id: "synsport3", name: "Sýn Sport 3", station: "Sýn", source: "syn", slug: "synsport3" },
  { id: "synsport4", name: "Sýn Sport 4", station: "Sýn", source: "syn", slug: "synsport4" },
  { id: "synsport5", name: "Sýn Sport 5", station: "Sýn", source: "syn", slug: "synsport5" },
  { id: "althingi", name: "Alþingi", station: "Alþingi", source: "althingi", slug: "althingi" },
];

export function getChannel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id);
}
