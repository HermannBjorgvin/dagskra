export interface Env {
  /** Normalized schedule cache, keyed `schedule:{channelId}:{YYYY-MM-DD}`. */
  SCHEDULE_CACHE: KVNamespace;
  /** Durable Object namespace backing the McpAgent (one DO per MCP session). */
  MCP_OBJECT: DurableObjectNamespace;
}
