import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { CHANNELS } from "./channels.js";
import { forwardDates, getSchedule, nowNext, today, windowDates } from "./cache.js";
import type { Env } from "./env.js";
import type { Program } from "./schema.js";

/** Render a day's programs as a compact, human-readable list (HH:MM titles). */
function formatDay(programs: Program[]): string {
  if (!programs.length) return "Engin dagskrá fannst.";
  return programs
    .map((p) => {
      const time = p.start.slice(11, 16);
      const ep = p.series?.episode
        ? ` (þáttur ${p.series.episode}${p.series.total ? "/" + p.series.total : ""})`
        : "";
      const flags = [p.live && "BEINT", p.premiere && "FRUMSÝNING", p.rerun && "ENDURT."]
        .filter(Boolean)
        .join(" ");
      return `${time}  ${p.title}${ep}${flags ? "  [" + flags + "]" : ""}`;
    })
    .join("\n");
}

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export class DagskraMCP extends McpAgent<Env> {
  server = new McpServer({ name: "dagskra", version: "0.1.0" });

  async init() {
    // --- Resources: addressable, cacheable schedule documents -----------------

    // The channel catalog: small and stable, ideal for a client to load once.
    this.server.registerResource(
      "channels",
      "dagskra://channels",
      { title: "Channels", description: "Icelandic TV channels this server covers", mimeType: "application/json" },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(CHANNELS, null, 2) }],
      }),
    );

    // One day of one channel, addressable by URI. Maps onto our KV cache keys.
    this.server.registerResource(
      "schedule",
      new ResourceTemplate("dagskra://schedule/{channel}/{date}", { list: undefined }),
      { title: "Channel schedule", description: "Schedule for a channel on a date (YYYY-MM-DD)", mimeType: "application/json" },
      async (uri, { channel, date }) => {
        const programs = await getSchedule(this.env, String(channel), String(date));
        return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(programs, null, 2) }] };
      },
    );

    // --- Tools: queries and search --------------------------------------------

    this.server.registerTool(
      "list_channels",
      { title: "List channels", description: "List the Icelandic TV channels available.", inputSchema: {} },
      async () => json(CHANNELS),
    );

    this.server.registerTool(
      "get_schedule",
      {
        title: "Get schedule",
        description: "Get a channel's schedule for a date (YYYY-MM-DD, defaults to today, Icelandic time).",
        inputSchema: { channel: z.string().describe("Channel id, e.g. 'ruv'"), date: z.string().optional() },
      },
      async ({ channel, date }) => {
        const day = date ?? today();
        try {
          const programs = await getSchedule(this.env, channel, day);
          return { content: [{ type: "text", text: `${channel} — ${day}\n${formatDay(programs)}` }] };
        } catch (e) {
          return {
            content: [{ type: "text", text: `${channel} — ${day}\nVilla við að sækja dagskrá: ${String(e)}` }],
            isError: true,
          };
        }
      },
    );

    this.server.registerTool(
      "whats_on",
      {
        title: "What's on now",
        description: "Current and next program on a channel (optionally at a given ISO time).",
        inputSchema: { channel: z.string(), at: z.string().optional().describe("ISO time, defaults to now") },
      },
      async ({ channel, at }) => {
        const when = at ? new Date(at) : new Date();
        if (Number.isNaN(when.getTime())) {
          return { content: [{ type: "text", text: `Ógilt tímagildi (at): ${at}` }], isError: true };
        }
        const [prev, day, next] = windowDates(when);
        try {
          // The target day is required; the neighbours are best-effort enrichment.
          const [before, target, after] = await Promise.all([
            getSchedule(this.env, channel, prev).catch(() => [] as Program[]),
            getSchedule(this.env, channel, day),
            getSchedule(this.env, channel, next).catch(() => [] as Program[]),
          ]);
          const programs = [...before, ...target, ...after].sort((a, b) => a.start.localeCompare(b.start));
          return json({ channel, at: when.toISOString(), ...nowNext(programs, when) });
        } catch (e) {
          return {
            content: [{ type: "text", text: `Villa við að sækja dagskrá fyrir ${channel}: ${String(e)}` }],
            isError: true,
          };
        }
      },
    );

    this.server.registerTool(
      "search_programs",
      {
        title: "Search programs",
        description: "Search titles/descriptions across channels over the next few days.",
        inputSchema: {
          query: z.string(),
          days: z.number().int().min(1).max(7).optional().describe("Forward window, default 3"),
          channels: z.array(z.string()).optional().describe("Channel ids; defaults to all"),
        },
      },
      async ({ query, days, channels }) => {
        const ids = channels?.length ? channels : CHANNELS.map((c) => c.id);
        const dates = forwardDates(days ?? 3);
        const q = query.toLowerCase();
        // Fetch every channel/day in parallel; individual failures are tolerated
        // so one flaky channel can't sink the whole search (best-effort by design).
        const schedules = await Promise.all(
          ids.flatMap((id) => dates.map((date) => getSchedule(this.env, id, date).catch(() => [] as Program[]))),
        );
        const hits = schedules
          .flat()
          .filter((p) => `${p.title} ${p.description ?? ""}`.toLowerCase().includes(q))
          .sort((a, b) => a.start.localeCompare(b.start));
        return json(hits);
      },
    );
  }
}
