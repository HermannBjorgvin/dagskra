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
 * - Sýn via the syn.is JSON API: `syn` and `synsport`..`synsport6`.
 *
 * Sýn hf. rebranded its "Stöð 2 Sport" tier to "Sýn Sport", and the flagship
 * general-entertainment feed is published under slug `syn`. There are no `stod2*`
 * slugs — those requests hang on the upstream. Beyond the officially-published
 * syn/synsport feeds, the rest of
 * the sport lineup (Sport Ísland, Viaplay, KKI TV) was discovered via the
 * `/api/epg/beint` endpoint. The higher Sport Ísland / KKI TV numbers are per-event
 * overflow channels that are empty most days (harmless — they just return []).
 * Sjónvarp Símans has no public EPG feed and stays out of scope.
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
  { id: "synsport6", name: "Sýn Sport 6", station: "Sýn", source: "syn", slug: "synsport6" },
  { id: "synsportisland", name: "Sýn Sport Ísland", station: "Sýn", source: "syn", slug: "synsportisland" },
  { id: "synsportisland2", name: "Sýn Sport Ísland 2", station: "Sýn", source: "syn", slug: "synsportisland2" },
  { id: "synsportisland3", name: "Sýn Sport Ísland 3", station: "Sýn", source: "syn", slug: "synsportisland3" },
  { id: "synsportisland4", name: "Sýn Sport Ísland 4", station: "Sýn", source: "syn", slug: "synsportisland4" },
  { id: "synsportisland5", name: "Sýn Sport Ísland 5", station: "Sýn", source: "syn", slug: "synsportisland5" },
  { id: "synsportviaplay", name: "Sýn Sport Viaplay", station: "Sýn", source: "syn", slug: "synsportviaplay" },
  { id: "kkitv1", name: "KKI TV 1", station: "Sýn", source: "syn", slug: "kkitv1" },
  { id: "kkitv2", name: "KKI TV 2", station: "Sýn", source: "syn", slug: "kkitv2" },
  { id: "kkitv3", name: "KKI TV 3", station: "Sýn", source: "syn", slug: "kkitv3" },
  { id: "kkitv4", name: "KKI TV 4", station: "Sýn", source: "syn", slug: "kkitv4" },
  { id: "kkitv5", name: "KKI TV 5", station: "Sýn", source: "syn", slug: "kkitv5" },
  { id: "kkitv6", name: "KKI TV 6", station: "Sýn", source: "syn", slug: "kkitv6" },
  { id: "althingi", name: "Alþingi", station: "Alþingi", source: "althingi", slug: "althingi" },
];

export function getChannel(id: string): Channel | undefined {
  return CHANNELS.find((c) => c.id === id);
}
