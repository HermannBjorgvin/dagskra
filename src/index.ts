import { refreshAll } from "./cache.js";
import type { Env } from "./env.js";
import { DagskraMCP } from "./mcp.js";

// Durable Object class must be exported for the runtime to find it.
export { DagskraMCP };

const HOME = `Remote MCP server for the broadcast schedule (dagskrá) of Icelandic TV channels.

MCP endpoint (Streamable HTTP): /mcp

Source: https://github.com/HermannBjorgvin/dagskra
Author: Hermann Haraldsson (hermann@hermann.is)
`;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      return DagskraMCP.serve("/mcp").fetch(request, env, ctx);
    }
    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "content-type": "text/plain" } });
    }
    return new Response(HOME, { headers: { "content-type": "text/plain; charset=utf-8" } });
  },

  // Daily cron: warm the schedule cache for all channels.
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(refreshAll(env));
  },
} satisfies ExportedHandler<Env>;
