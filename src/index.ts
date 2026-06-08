/* @socheli/sdk — the official TypeScript client for the Socheli content engine.
 *
 *   import { createSocheli } from "@socheli/sdk";
 *   const socheli = createSocheli({ apiKey: process.env.SOCHELI_API_KEY });
 *   const { devices } = await socheli.fleet();
 *   const job = await socheli.generate({ seed: "why we procrastinate", channel: "concept_lab" });
 *
 * Zero runtime dependencies — just `fetch`. Works in Node 18+, Bun, Deno, edge.
 */
export * from "./types.js";
import type { Item, ItemSummary, JobRow, GenerateInput, PublishInput, Schedule, FleetState, Job } from "./types.js";

export interface SocheliOptions {
  /** API key (Bearer). Falls back to env SOCHELI_API_KEY. */
  apiKey?: string;
  /** API base URL. Defaults to env SOCHELI_API_URL or https://api.socheli.com. */
  baseUrl?: string;
  /** Custom fetch (for testing / non-standard runtimes). */
  fetch?: typeof fetch;
}

export class SocheliError extends Error {
  constructor(message: string, readonly status: number, readonly body?: unknown) {
    super(message);
    this.name = "SocheliError";
  }
}

export interface SocheliClient {
  health(): Promise<{ ok: boolean; version: string; uptime: number }>;
  items: {
    list(params?: { limit?: number; channel?: string }): Promise<ItemSummary[]>;
    get(id: string): Promise<Item>;
    publish(id: string, input?: PublishInput): Promise<{ dispatched: boolean }>;
  };
  generate(input: GenerateInput): Promise<{ dispatched: boolean; job: Job }>;
  jobs(): Promise<JobRow[]>;
  fleet(): Promise<FleetState>;
  schedule: {
    get(): Promise<Schedule>;
    set(schedule: Schedule): Promise<Schedule>;
  };
}

const DEFAULT_BASE = "https://api.socheli.com";

export function createSocheli(opts: SocheliOptions = {}): SocheliClient {
  const apiKey = opts.apiKey ?? (typeof process !== "undefined" ? process.env?.SOCHELI_API_KEY : undefined);
  const baseUrl = (opts.baseUrl ?? (typeof process !== "undefined" ? process.env?.SOCHELI_API_URL : undefined) ?? DEFAULT_BASE).replace(/\/$/, "");
  const doFetch = opts.fetch ?? fetch;

  async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${baseUrl}/v1${path}`, {
      method,
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : undefined;
    if (!res.ok) throw new SocheliError((data as any)?.error ?? `${method} ${path} → ${res.status}`, res.status, data);
    return data as T;
  }

  return {
    health: () => req("GET", "/health"),
    items: {
      list: (p = {}) => req("GET", `/items?${new URLSearchParams({ ...(p.limit ? { limit: String(p.limit) } : {}), ...(p.channel ? { channel: p.channel } : {}) })}`),
      get: (id) => req("GET", `/items/${encodeURIComponent(id)}`),
      publish: (id, input = {}) => req("POST", `/items/${encodeURIComponent(id)}/publish`, input),
    },
    generate: (input) => req("POST", "/generate", input),
    jobs: () => req("GET", "/jobs"),
    fleet: () => req("GET", "/fleet"),
    schedule: {
      get: () => req("GET", "/schedule"),
      set: (s) => req("PUT", "/schedule", s),
    },
  };
}

export default createSocheli;
