/** A single broadcast, normalized across all sources. Times are ISO 8601 UTC
 *  (Iceland has no DST, so local Icelandic time equals UTC year-round). */
export interface Program {
  /** Our canonical channel id, e.g. "ruv". */
  channel: string;
  /** Broadcaster, e.g. "RÚV" or "Sýn". */
  station: string;
  /** Start, ISO 8601 UTC. */
  start: string;
  /** End, ISO 8601 UTC. */
  end: string;
  title: string;
  originalTitle?: string;
  description?: string;
  category?: string;
  series?: { season?: number; episode?: number; total?: number };
  live?: boolean;
  /** First showing, where the source reports it (e.g. Sýn's `frumsyning`). */
  premiere?: boolean;
  /** Repeat broadcast, where the source reports it (e.g. RÚV's `<rerun>`). */
  rerun?: boolean;
  /** Age/content rating as given upstream, e.g. "Green". */
  rating?: string;
}
