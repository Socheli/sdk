# @socheli/sdk

> **The official, zero-dependency, fully typed TypeScript client for the Socheli content engine — the foundation every other Socheli surface builds on.**

<p>
  <a href="https://www.npmjs.com/package/@socheli/sdk"><img alt="npm" src="https://img.shields.io/npm/v/@socheli/sdk?color=0b0b0b&labelColor=000000&logo=npm"></a>
  <a href="https://www.npmjs.com/package/@socheli/sdk"><img alt="downloads" src="https://img.shields.io/npm/dm/@socheli/sdk?color=0b0b0b&labelColor=000000"></a>
  <img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-0b0b0b?labelColor=000000">
  <img alt="types" src="https://img.shields.io/npm/types/@socheli/sdk?color=0b0b0b&labelColor=000000&logo=typescript&logoColor=white">
  <img alt="runtimes" src="https://img.shields.io/badge/runtime-Node%2018%2B%20%C2%B7%20Bun%20%C2%B7%20Deno%20%C2%B7%20edge-0b0b0b?labelColor=000000">
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/npm/l/@socheli/sdk?color=0b0b0b&labelColor=000000"></a>
</p>

---

## What it is

`@socheli/sdk` is the official TypeScript client for the [Socheli](https://socheli.com) content engine — the agentic system that turns a single idea into a finished, premium vertical video, end to end.

It is a thin, **zero-runtime-dependency** wrapper over the Socheli HTTP API (`https://api.socheli.com`). Just `fetch` under the hood, so it runs anywhere modern JavaScript runs:

- **Node 18+**
- **Bun**
- **Deno**
- **Edge runtimes** (Cloudflare Workers, Vercel Edge, etc.)

Every shape it returns is a stable, lean public DTO — intentionally decoupled from the engine's internal schemas so the public contract stays stable while the internals evolve.

This SDK is the foundation the rest of the Socheli ecosystem builds on — the [CLI](https://github.com/Socheli/cli) and [MCP server](https://github.com/Socheli/mcp) are surfaces over the same client.

---

## Install

```bash
npm install @socheli/sdk
# or
pnpm add @socheli/sdk
# or
bun add @socheli/sdk
# or
yarn add @socheli/sdk
```

It ships as pure ESM (`"type": "module"`) with types bundled — no `@types/*` package required.

---

## Authentication

Socheli uses a **single API key**, sent as a **Bearer** token.

The client reads your key, in order of precedence:

1. The `apiKey` option passed to `createSocheli({ apiKey })`.
2. The `SOCHELI_API_KEY` environment variable (used automatically when no `apiKey` is given and `process.env` is available).

The base URL is resolved the same way:

1. The `baseUrl` option.
2. The `SOCHELI_API_URL` environment variable.
3. Default: `https://api.socheli.com`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `SOCHELI_API_KEY` | Your Socheli API key (sent as `Authorization: Bearer <key>`) | — |
| `SOCHELI_API_URL` | API base URL | `https://api.socheli.com` |

Every request is sent to `<baseUrl>/v1/...` with the header:

```
Authorization: Bearer <SOCHELI_API_KEY>
```

```bash
export SOCHELI_API_KEY="sk_..."
```

---

## Quickstart

```ts
import { createSocheli } from "@socheli/sdk";

// Reads SOCHELI_API_KEY from the environment when no apiKey is passed.
const socheli = createSocheli({ apiKey: process.env.SOCHELI_API_KEY });

// Is the engine up?
const { ok, version, uptime } = await socheli.health();

// See the render fleet.
const { devices, online } = await socheli.fleet();

// Generate a post from a single seed idea.
const { dispatched, job } = await socheli.generate({
  seed: "why we procrastinate",
  channel: "concept_lab",
});

console.log(dispatched, job.id);
```

A `createSocheli` call returns a `SocheliClient`. The default export is `createSocheli` itself, so this also works:

```ts
import createSocheli from "@socheli/sdk";
const socheli = createSocheli();
```

---

## Client configuration

```ts
createSocheli(opts?: SocheliOptions): SocheliClient
```

### `SocheliOptions`

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | API key sent as a Bearer token. Falls back to `SOCHELI_API_KEY`. |
| `baseUrl` | `string` | API base URL. Falls back to `SOCHELI_API_URL`, then `https://api.socheli.com`. A trailing slash is stripped automatically. |
| `fetch` | `typeof fetch` | Custom `fetch` implementation, for testing or non-standard runtimes. Defaults to the global `fetch`. |

---

## Reference

All methods are `async` and return parsed JSON typed per the DTOs below. Requests are issued against `<baseUrl>/v1<path>`.

### `client.health()`

Returns the engine health probe.

```ts
health(): Promise<{ ok: boolean; version: string; uptime: number }>
```

`GET /v1/health`

---

### `client.items`

Read and act on generated content items.

#### `items.list(params?)`

List item summaries, newest-relevant first.

```ts
items.list(params?: { limit?: number; channel?: string }): Promise<ItemSummary[]>
```

`GET /v1/items` — `limit` and `channel` are passed as query parameters when provided.

```ts
const items = await socheli.items.list({ channel: "concept_lab", limit: 20 });
```

#### `items.get(id)`

Fetch a single, fully hydrated item by id.

```ts
items.get(id: string): Promise<Item>
```

`GET /v1/items/:id`

#### `items.publish(id, input?)`

Dispatch a publish for an item.

```ts
items.publish(id: string, input?: PublishInput): Promise<{ dispatched: boolean }>
```

`POST /v1/items/:id/publish`

```ts
await socheli.items.publish("itm_123", { public: true, aigc: true });
```

---

### `client.generate(input)`

Generate a new post from a seed idea. With `type: "auto"` the engine also publishes after render; with `type: "new"` (the default) it builds only.

```ts
generate(input: GenerateInput): Promise<{ dispatched: boolean; job: Job }>
```

`POST /v1/generate`

```ts
const { dispatched, job } = await socheli.generate({
  seed: "the physics of a perfect espresso",
  channel: "concept_lab",
  mood: "cinematic",
  voice: true,
  type: "auto", // build + publish
});
```

---

### `client.jobs()`

List job rows (queued, running, and finished work) with live progress.

```ts
jobs(): Promise<JobRow[]>
```

`GET /v1/jobs`

---

### `client.fleet()`

Get the current render fleet — devices, their jobs, and how many are online.

```ts
fleet(): Promise<FleetState>
```

`GET /v1/fleet`

```ts
const { devices, jobs, online } = await socheli.fleet();
```

---

### `client.schedule`

Read and replace the autopilot posting schedule.

#### `schedule.get()`

```ts
schedule.get(): Promise<Schedule>
```

`GET /v1/schedule`

#### `schedule.set(schedule)`

Replace the full schedule.

```ts
schedule.set(schedule: Schedule): Promise<Schedule>
```

`PUT /v1/schedule`

```ts
const current = await socheli.schedule.get();
await socheli.schedule.set({ ...current, enabled: true });
```

---

## Endpoint summary

| Method | Endpoint | SDK call |
| --- | --- | --- |
| `GET` | `/v1/health` | `client.health()` |
| `GET` | `/v1/items` | `client.items.list(params?)` |
| `GET` | `/v1/items/:id` | `client.items.get(id)` |
| `POST` | `/v1/items/:id/publish` | `client.items.publish(id, input?)` |
| `POST` | `/v1/generate` | `client.generate(input)` |
| `GET` | `/v1/jobs` | `client.jobs()` |
| `GET` | `/v1/fleet` | `client.fleet()` |
| `GET` | `/v1/schedule` | `client.schedule.get()` |
| `PUT` | `/v1/schedule` | `client.schedule.set(schedule)` |

---

## Error handling

Any non-2xx response throws a `SocheliError`. It carries the HTTP `status` and the parsed response `body`. The message is the API's `error` field when present, otherwise `"<METHOD> <path> → <status>"`.

```ts
import { createSocheli, SocheliError } from "@socheli/sdk";

const socheli = createSocheli();

try {
  await socheli.items.get("does-not-exist");
} catch (err) {
  if (err instanceof SocheliError) {
    console.error(err.status); // e.g. 404
    console.error(err.body);   // parsed response body
    console.error(err.message);
  }
}
```

```ts
class SocheliError extends Error {
  name: "SocheliError";
  status: number;
  body?: unknown;
}
```

---

## Types

All types are exported from the package root (`export * from "./types"`).

### `GenerateInput`

```ts
interface GenerateInput {
  seed: string;
  channel?: string;
  mood?: string;
  voice?: boolean;
  /** "auto" also publishes after render; "new" builds only. Default "new". */
  type?: "auto" | "new";
}
```

### `PublishInput`

```ts
interface PublishInput {
  public?: boolean;
  /** Declare AI-generated content (defaults true). */
  aigc?: boolean;
}
```

### `ItemSummary`

```ts
interface ItemSummary {
  id: string;
  channel: string;
  status: ItemStatus | string;
  title: string;
  createdAt: string;
  updatedAt: string;
  qa?: number;
  costUsd?: number;
  publish?: PublishEntry[];
}
```

### `Item` (extends `ItemSummary`)

```ts
interface Item extends ItemSummary {
  idea?: { topic: string; angle: string; format: string };
  script?: { hook: string; narration: string[]; cta: string };
  storyboard?: {
    topic: string;
    format: string;
    scenes: { id: string; type: string; durationSec: number }[];
  };
  pkg?: { title: string; caption: string; hashtags: string[]; altText?: string };
  videoUrl?: string;
}
```

### `ItemStatus`

```ts
type ItemStatus =
  | "idea_proposed"
  | "script_ready"
  | "storyboard_ready"
  | "qa_passed"
  | "qa_failed"
  | "rendered"
  | "packaged"
  | "failed";
```

### `PublishEntry`

```ts
interface PublishEntry {
  platform: string;
  status: string;
  url?: string;
  id?: string;
  at: string;
}
```

### `Job` & `JobRow`

```ts
type JobType = "auto" | "new" | "ping";

interface Job {
  id: string;
  type: JobType;
  channel?: string;
  seed?: string;
  by?: string;
  createdAt: string;
}

interface JobRow extends Job {
  status: "dispatched" | "running" | "done" | "error";
  device?: string;
  itemId?: string;
  message?: string;
  progress: { at: string; line: string }[];
  updatedAt: string;
}
```

### `Device`, `DeviceProfile` & `DeviceStatus`

```ts
type DeviceStatus = "online" | "idle" | "busy" | "offline";

interface DeviceProfile {
  arch: string;
  platform: string;
  cpus: number;
  ramGb: number;
  gpu: string;
}

interface Device {
  device: string;
  status: DeviceStatus;
  host?: string;
  caps?: string[];
  profile?: DeviceProfile;
  currentJob?: string | null;
  lastSeen: string;
}
```

### `FleetState`

```ts
interface FleetState {
  devices: Device[];
  jobs: JobRow[];
  online: number;
}
```

### `Schedule`

```ts
interface Schedule {
  enabled: boolean;
  timezone: string;
  graceMinutes: number;
  channels: {
    channel: string;
    enabled: boolean;
    slots: {
      time: string;
      channel: string;
      mood?: string;
      seed?: string;
      public: boolean;
    }[];
  }[];
}
```

---

## The Socheli ecosystem

`@socheli/sdk` is one of four sibling surfaces over the same engine. Use whichever fits your environment:

| Repo | What it is |
| --- | --- |
| [**Socheli/api**](https://github.com/Socheli/api) | The HTTP API at `api.socheli.com` that this SDK talks to. |
| [**Socheli/sdk**](https://github.com/Socheli/sdk) | This package — the zero-dependency typed TypeScript client. |
| [**Socheli/cli**](https://github.com/Socheli/cli) | The `socheli` command-line tool, built on this SDK. |
| [**Socheli/mcp**](https://github.com/Socheli/mcp) | The Model Context Protocol server, exposing Socheli to agents. |

Full guides and reference live at the **[docs site](https://docs.socheli.com)**.

---

## Developed in the Socheli monorepo

This package is developed inside the **Socheli monorepo** (`packages/sdk`) alongside the engine, API, CLI, and MCP server, then published standalone. The mirrored public repo at [github.com/Socheli/sdk](https://github.com/Socheli/sdk) tracks the same source.

---

## License

[MIT](./LICENSE)
