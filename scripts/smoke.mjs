// Smoke-test the running MCP server over Streamable HTTP — no chat client needed.
// Usage: `npm run dev` in one shell, then `node scripts/smoke.mjs`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://localhost:8787/mcp";
const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));

const tools = await client.listTools();
console.log("tools:", tools.tools.map((t) => t.name).join(", "));

const resources = await client.listResources();
console.log("resources:", resources.resources.map((r) => r.uri).join(", "));

const sched = await client.callTool({ name: "get_schedule", arguments: { channel: "ruv" } });
console.log("\nget_schedule(ruv):\n" + sched.content[0].text.split("\n").slice(0, 6).join("\n"));

const syn = await client.callTool({ name: "whats_on", arguments: { channel: "syn" } });
console.log("\nwhats_on(syn):\n" + syn.content[0].text.slice(0, 300));

await client.close();
console.log("\nOK");
