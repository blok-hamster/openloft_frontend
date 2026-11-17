/**
 * Documentation content for the NMAFC framework, Hermes plugin, and OpenLoft services.
 *
 * Content is data, not JSX, so the search index and the rendered page read from
 * one source. Adding a section means adding an entry here plus a nav group
 * label in `GROUPS`.
 *
 * Claim discipline: this page is an external claim surface and is held to the
 * same standard as README.md. Every limitation stated below is real and
 * measured, and none of them is softened because it is inconvenient to sell.
 * If a capability is pending, the copy says pending.
 */

export type Callout = { kind: 'note' | 'warn' | 'good'; title: string; body: string };

export type Block =
  | { t: 'p'; text: string }
  | { t: 'lead'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'code'; label: string; lang: string; code: string }
  | { t: 'table'; headers: string[]; rows: string[][] }
  | { t: 'callout'; callout: Callout }
  | { t: 'cards'; cards: Array<{ title: string; body: string }> };

export type DocSection = {
  id: string;
  label: string;
  group: string;
  blocks: Block[];
};

export const GROUPS = [
  'Getting started',
  'Integrations',
  'Services',
  'Reference',
  'How it works',
] as const;

export const SECTIONS: DocSection[] = [
  // ---------------------------------------------------------------- getting started
  {
    id: 'overview',
    label: 'Overview',
    group: 'Getting started',
    blocks: [
      {
        t: 'lead',
        text: 'NMAFC is a stateful memory layer for LLM agents. It is the engine behind OpenLoft Memory, installable into any Python 3.11–3.13 project via pip — free for non-commercial use under PolyForm Noncommercial 1.0.0.',
      },
      {
        t: 'p',
        text: 'It exists to solve one problem: assistants that forget. Rather than stuffing raw transcripts into a vector database and paying for repeated summarisation passes, NMAFC compacts each turn into atomic facts with resolved absolute dates at write time, lets unused facts fade on a decay curve, and retrieves through reciprocal rank fusion across hot vectors, cold archive search, and graph links.',
      },
      { t: 'h3', text: 'What you get' },
      {
        t: 'table',
        headers: ['Capability', 'What it does'],
        rows: [
          ['Temporal grounding', 'Resolves "last week" to a real date when the fact is written, so a question about dates can be answered precisely later.'],
          ['Decay and reinforcement', 'Facts fade with conversational turns; every retrieval strengthens retention. Frequently-used facts persist, one-off noise expires.'],
          ['Three memory types', 'CoreAnchor (identity and immutable rules, never decay), ActiveContext (current state), EphemeralState (session noise).'],
          ['Dual-tier storage', 'A small working set in LanceDB plus an append-only archive in SQLite (or PostgreSQL) with full-text search. No external vector database required.'],
          ['Graph retrieval', 'Entity links are resolved on ingest, so multi-hop queries traverse relationships up to two hops rather than relying on similarity alone.'],
          ['Source attribution', 'Every fact points at the turns it was extracted from, so you can show a user why the assistant believes something.'],
          ['Five ways to connect', 'Python SDK (pip install nmafc), REST, MCP (nmafc-mcp), the Hermes Agent plugin (openloft-memory), and an OpenAI-compatible wrapper.'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'It is a Python package first',
          body: 'Install pip install "nmafc[llm]" and import directly from nmafc in any Python project — no repository clone, config file, or OpenLoft account required. PolyForm Noncommercial 1.0.0 covers personal, research, education, non-profit, and government use (it is not OSI-approved; commercial use requires a separate licence).',
        },
      },
    ],
  },

  {
    id: 'install',
    label: 'Install',
    group: 'Getting started',
    blocks: [
      {
        t: 'p',
        text: 'Python 3.11, 3.12, or 3.13 on macOS, Linux, or Windows. Install the package directly into your project environment, with optional extras for the providers and interfaces you use.',
      },
      { t: 'h3', text: 'Install the Python package' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `# core + OpenAI and Anthropic provider SDKs
pip install "nmafc[llm]"

# or with uv
uv add "nmafc[llm]"

# verify the public surface
python -c "import nmafc; print(nmafc.__version__)"`,
      },
      { t: 'h3', text: 'Optional extras' },
      {
        t: 'p',
        text: 'The core install (pip install nmafc) includes LanceDB hot storage, SQLite cold archive, and the cognitive event log with zero external cloud dependencies. Compose extras as needed — missing an optional SDK raises a MissingExtraError naming the exact pip install command.',
      },
      {
        t: 'table',
        headers: ['Extra', 'Install', 'What it adds'],
        rows: [
          ['(core)', 'pip install nmafc', 'Two-tier storage, decay/LTP engine, and core public API'],
          ['llm', 'pip install "nmafc[llm]"', 'openai + anthropic SDKs (covers OpenAI, Anthropic, Groq, OpenRouter, Together, Azure, Ollama, LM Studio, vLLM)'],
          ['aws', 'pip install "nmafc[aws]"', 'boto3 for AWS Bedrock LLM and embedding routes'],
          ['postgres', 'pip install "nmafc[postgres]"', 'psycopg2-binary for the PostgreSQL / CockroachDB cold tier'],
          ['fastembed', 'pip install "nmafc[fastembed]"', 'Key-free local ONNX embeddings (no API calls)'],
          ['mcp', 'pip install "nmafc[mcp]"', 'Stdio MCP server entry point (nmafc-mcp)'],
          ['web', 'pip install "nmafc[web]"', 'FastAPI REST server entry point (nmafc-web)'],
          ['cli', 'pip install "nmafc[cli]"', 'Rich terminal UI for nmafc init and nmafc chat'],
          ['bench', 'pip install "nmafc[bench]"', 'LoCoMo / benchmark tooling dependencies'],
          ['all', 'pip install "nmafc[all]"', 'All optional dependency groups combined'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'The extraction step needs tool-calling',
          body: 'Facts are extracted by asking your model to call a tool. A provider without tool-calling can serve recall but cannot write memory, so the engine will look healthy and quietly remember nothing. Every hosted and local provider listed under Providers supports it; check yours does.',
        },
      },
      { t: 'h3', text: 'Where your data lives' },
      {
        t: 'p',
        text: 'Installed as a package, NMAFC stores data in a stable per-user platform directory rather than polluting whichever working directory your script runs from: ~/Library/Application Support/nmafc on macOS, ~/.local/share/nmafc on Linux, and %APPDATA%\\nmafc on Windows. Set NMAFC_DATA_DIR to point somewhere else (or NMAFC_DATA_DIR=./data to keep using a legacy checkout directory).',
      },
      { t: 'h3', text: 'As an HTTP server' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `pip install "nmafc[web,llm]"
nmafc-web --host 127.0.0.1 --port 8000

# interactive OpenAPI surface
open http://127.0.0.1:8000/docs`,
      },
      {
        t: 'p',
        text: 'The nmafc[web] wheel ships the FastAPI REST server and OpenAPI docs. The companion Next.js explorer dashboard is a repository/Docker feature (NMAFC_STATIC_UI_DIR), not bundled inside the PyPI wheel.',
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Before you expose nmafc-web to a network',
          body: 'Out of the box, the server\'s explorer endpoints trust an X-Agent-Id header and do not require an API key, and the tenant instance cache is unbounded. On a shared network that is a cross-tenant read and denial-of-service surface. Run it on localhost behind an authenticating proxy, or use the OpenLoft Memory service, which binds each tenant to a credential and bounds the cache.',
        },
      },
      { t: 'h3', text: 'From source (contributors & benchmarks)' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `# only needed to modify NMAFC, run the Next.js explorer UI, or reproduce benchmarks
git clone https://github.com/blok-hamster/nmafc.git
cd nmafc
uv sync --extra all
uv run pytest -q`,
      },
    ],
  },

  {
    id: 'quickstart',
    label: 'Quick start',
    group: 'Getting started',
    blocks: [
      {
        t: 'p',
        text: 'Everything in the stable public API is imported directly from nmafc. With OPENAI_API_KEY set, from_openai() works with zero configuration files.',
      },
      {
        t: 'code',
        label: 'python — minimal sync',
        lang: 'python',
        code: `from nmafc import SyncNeuromorphicMemory

with SyncNeuromorphicMemory.from_openai() as mem:   # reads OPENAI_API_KEY
    stored = mem.remember([{"role": "user", "content": "I run a bike shop in Lisbon."}])
    print(stored.updates_ingested)                   # facts extracted & stored

    # read-only retrieval — performs no writes and no reinforcement
    hits = mem.recall("where is the shop?")
    print(hits.context)                              # bounded, source-attributed context
    print(f"~{hits.token_estimate} tokens, {len(hits.hits)} hits")`,
      },
      { t: 'h3', text: 'Async & full-turn chat' },
      {
        t: 'code',
        label: 'python — async process_turn',
        lang: 'python',
        code: `import asyncio
from nmafc import NeuromorphicMemory, NMafcConfig

async def main():
    config = NMafcConfig(
        llm_provider_model="openai/gpt-4o-mini",
        embedding_provider_model="openai/text-embedding-3-small",
    )
    async with NeuromorphicMemory.from_config(config=config) as mem:
        # one turn: recalls context, generates the reply, and extracts new facts
        reply = await mem.process_turn("I moved to Porto in March.")
        print(reply)

        reply = await mem.process_turn("Which city am I in?")
        print(reply)

asyncio.run(main())`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'good',
          title: 'Use process_turn when you want both reply and memory',
          body: 'In a chat loop you control, process_turn() fuses fact extraction into the same LLM call that produces the assistant reply. Calling remember() and recall() separately is ideal when wrapping an external agent or Hermes turn, where generation already happens elsewhere.',
        },
      },
      { t: 'h3', text: 'Actionable errors & config precedence' },
      {
        t: 'p',
        text: 'Configuration always resolves in one order: explicit NMafcConfig argument > NMAFC_* environment variables > optional TOML file > library defaults. Every intentional failure subclasses NmafcError (MissingAPIKeyError, MissingExtraError, ProviderNotConfiguredError, StorageError) and names the exact env var, pip extra, or path to fix.',
      },
      { t: 'h3', text: 'Talking to it over HTTP' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `# /v1/memories is Mem0-shaped, so migrating from Mem0 is a base URL and a key
curl -X POST http://127.0.0.1:8000/v1/memories \\
  -H "Authorization: Bearer $NMAFC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"I moved to Porto in March."}]}'

curl -X POST http://127.0.0.1:8000/v1/memories/search \\
  -H "Authorization: Bearer $NMAFC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"where did I move?"}'`,
      },
    ],
  },

  // ---------------------------------------------------------------- integrations
  {
    id: 'integrations',
    label: 'Choosing an integration',
    group: 'Integrations',
    blocks: [
      {
        t: 'p',
        text: 'Five ways in. They reduce to one decision: whether you are embedding memory inside your own code, wiring an agent harness, or fronting an HTTP service.',
      },
      {
        t: 'table',
        headers: ['Integration', 'Use it when', 'Cost', 'Tool-calling safe'],
        rows: [
          ['Python SDK (pip install nmafc)', 'You own the Python application and want in-process speed.', 'Lowest — one LLM call per process_turn.', 'Yes'],
          ['Hermes Agent plugin (openloft-memory)', 'You run Hermes Agent (CLI, TUI, Desktop, or Gateway).', 'Auto recall pre-turn; background ingest post-turn.', 'Yes — adds 5 loft_* tools'],
          ['MCP (nmafc-mcp)', 'You want zero code change in Claude Code, Cursor, or Codex.', 'One extraction call per memory_remember.', 'Yes'],
          ['REST (/v1/memories)', 'You are not Python, or you want a service boundary.', 'Two calls per turn if split; one via /chat.', 'Yes'],
          ['OpenAI endpoint (/v1/chat/completions)', 'You only want to change a base URL for plain chat.', 'Two calls per turn.', 'No — see below'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'The OpenAI-compatible endpoint drops tools',
          body: 'POST /v1/chat/completions forwards a fixed allow-list of sampling parameters. tools, tool_choice and parallel_tool_calls are not on it, so tool-calling clients break when pointed at it. If your harness uses tools, use the Python SDK, Hermes plugin, MCP, or explicit REST remember/recall endpoints instead.',
        },
      },
    ],
  },

  {
    id: 'mcp',
    label: 'MCP — coding agents',
    group: 'Integrations',
    blocks: [
      {
        t: 'p',
        text: 'The zero-code-change path for coding editors and CLI agents. Install nmafc[mcp,llm] (or run via uvx) to expose six tools over stdio via the nmafc-mcp entry point — no repository checkout required.',
      },
      {
        t: 'table',
        headers: ['Tool', 'Purpose'],
        rows: [
          ['memory_recall', 'Retrieve context for a question. Read-only.'],
          ['memory_remember', 'Ingest a transcript. Costs one LLM call for extraction.'],
          ['memory_forget', 'Invalidate an entity. Temporal, not destructive — see Limitations.'],
          ['index_repo', 'Index a git repository for code search. Fully offline, no tokens.'],
          ['find_callers', 'What references this symbol, with file:line.'],
          ['repo_status', 'Which indexed files have changed since indexing.'],
        ],
      },
      { t: 'h3', text: 'Claude Code / Claude Desktop' },
      {
        t: 'code',
        label: '.mcp.json (installed package)',
        lang: 'json',
        code: `{
  "mcpServers": {
    "memory": {
      "command": "nmafc-mcp",
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "NMAFC_DATA_DIR": "/path/to/your/memory-data"
      }
    }
  }
}`,
      },
      { t: 'h3', text: 'Cursor (zero-install via uvx)' },
      {
        t: 'code',
        label: '.cursor-mcp.json',
        lang: 'json',
        code: `{
  "mcpServers": {
    "memory": {
      "command": "uvx",
      "args": ["--from", "nmafc[mcp,llm]", "nmafc-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Data location without a config file',
          body: 'nmafc-mcp skips missing TOML files silently and defaults to your per-user platform data directory unless NMAFC_DATA_DIR or NMAFC_HOT_URI / NMAFC_COLD_URI are set in env. Use the full virtualenv path to nmafc-mcp if your IDE launches without activating your shell PATH.',
        },
      },
      {
        t: 'p',
        text: 'Codex uses the same JSON shape in .codex-mcp.json. If you are connecting to the hosted OpenLoft Memory service instead of a local store, use the HTTP MCP config from Memory > Connections (/memory/connections).',
      },
    ],
  },

  {
    id: 'hermes-plugin',
    label: 'Hermes Agent plugin',
    group: 'Integrations',
    blocks: [
      {
        t: 'lead',
        text: 'OpenLoft Memory (openloft-memory) is an MIT-licensed memory provider plugin for any Hermes Agent deployment (>= 0.19.0), with zero Python dependencies (stdlib-only HTTP client).',
      },
      {
        t: 'p',
        text: 'It injects relevant memories automatically before every LLM turn, ingests completed turns on a background thread without blocking your session, registers a memory-hygiene skill, and exposes five loft_* memory tools. Point it at the hosted OpenLoft edge (https://api.openloft.xyz/api/memory) or your own self-hosted memory service (http://<host>:8100/v1/memory).',
      },
      { t: 'h3', text: 'Install' },
      {
        t: 'code',
        label: 'shell — drop-in install (works today)',
        lang: 'bash',
        code: `# 1. Clone into Hermes plugins directory
git clone https://github.com/blok-hamster/hermes-plugin-openloft-memory \\
      "$HOME/.hermes/plugins/openloft-memory"

# 2. Enable (prompts for OPENLOFT_MEMORY_API_KEY) and select the provider
hermes plugins enable openloft-memory
hermes memory setup

# 3. Verify connectivity and tenant provisioning
hermes openloft-memory health`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Catalog install status: pending review',
          body: 'The drop-in clone path above is tested and working on Hermes v0.19.0. A submission for hermes plugins install openloft-memory is prepared for the upstream NousResearch/hermes-agent plugin catalog and is pending catalog review.',
        },
      },
      { t: 'h3', text: 'Getting an API key' },
      {
        t: 'list',
        items: [
          'Hosted OpenLoft: open Memory > Connections (/memory/connections) and mint a key (nmafc_<tenant>.<secret>). The secret is shown once; the key carries your tenant so no header can switch tenants.',
          'Self-hosted backend: run your OpenLoft memory service on port 8100, point base_url at http://<host>:8100/v1/memory, and mint a service key with: python -c "from app.auth import generate_key; print(generate_key(\'my_tenant\'))".',
        ],
      },
      { t: 'h3', text: 'What the agent gets' },
      {
        t: 'table',
        headers: ['Capability', 'Behaviour'],
        rows: [
          ['Automatic recall (prefetch)', 'Recalls relevant facts before every turn (fail-open, 8s socket timeout, 6,000-char injection budget). Unreachable backends degrade cleanly to no injected context.'],
          ['Background ingest (sync_turn)', 'Persists completed turns via Hermes spawn_context_thread (at most one ingest in flight; queued turns never block chat).'],
          ['Warm prefetch (queue_prefetch)', 'Optional lightweight post-turn recall keeping the backend store warm for the next turn.'],
          ['loft_recall(query, top_k?)', 'On-demand read-only retrieval (no writes or reinforcement).'],
          ['loft_remember(text)', 'Explicit curation ("remember that I prefer dark mode"); costs one server-side extraction call.'],
          ['loft_forget(entity_name | record_id)', 'Temporal invalidation — stops retrieving the fact while the write-ahead archive retains it (not erasure).'],
          ['loft_stats()', 'Returns the current turn number plus hot/cold/event counts for the agent store.'],
          ['loft_search(query, limit?)', 'Scored vector search over stored records.'],
        ],
      },
      { t: 'h3', text: 'Configuration & scoping' },
      {
        t: 'p',
        text: 'Non-secret settings live in $HERMES_HOME/openloft-memory/config.json (shared with the Hermes Desktop panel). OPENLOFT_MEMORY_API_KEY is stored in your Hermes profile .env and read solely through agent.secret_scope.get_secret() so multiplexed profiles stay isolated.',
      },
      {
        t: 'table',
        headers: ['Key', 'Default', 'Purpose'],
        rows: [
          ['base_url', 'https://api.openloft.xyz/api/memory', 'Hosted edge, or http://<host>:8100/v1/memory when self-hosting.'],
          ['agent_id', 'auto', 'Resolves config -> OPENLOFT_MEMORY_AGENT_ID env -> Hermes profile name -> "hermes".'],
          ['conversation_scope', 'agent', '"agent" (recommended, immune to session rotation), "session" (per Hermes session), or "shared" (tenant-wide pool).'],
          ['top_k / inject_budget', '8 / 6000', 'Recall breadth and max injected characters (head/tail trimmed).'],
          ['ingest_enabled / toolset_enabled', 'true / true', 'Toggle automatic turn persistence or loft_* tool exposure.'],
          ['warm_next_turn', 'true', 'Keep backend store warm between turns.'],
          ['pre_compress_archive / memory_write_mirror', 'false / false', 'Phase 3 opt-in hooks: archive transcripts pre-compression (digest-idempotent) and mirror MEMORY.md / USER.md edits.'],
          ['backfill_enabled / backfill_batch_size / backfill_rate_ms', 'false / 10 / 1500', 'Phase 3.4 opt-in session transcript backfill controls.'],
        ],
      },
      { t: 'h3', text: 'CLI commands' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `hermes openloft-memory health
hermes openloft-memory stats
hermes openloft-memory remember "our staging port is 8123"
hermes openloft-memory recall "staging port"
hermes openloft-memory search "staging" --limit 5
hermes openloft-memory forget <entity_name> --yes
hermes openloft-memory backfill --sessions-file sessions.json --dry-run`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Disclosures before installing',
          body: 'Completed turns — including tool calls and tool results Hermes attaches to a turn transcript — are sent over HTTPS to your configured memory backend unless ingest_enabled is false. loft_forget performs temporal invalidation, not deletion. If self-hosting, the plugin validates forget targets against [A-Za-z0-9_-] client-side as defense-in-depth.',
        },
      },
    ],
  },

  {
    id: 'drop-in',
    label: 'OpenAI drop-in',
    group: 'Integrations',
    blocks: [
      {
        t: 'p',
        text: 'If your stack is already OpenAI-shaped, MemoryOpenAI wraps an OpenAI or AsyncOpenAI client and interposes memory on chat.completions.create. It recalls on the way in (including streaming calls) and remembers once the response completes.',
      },
      {
        t: 'code',
        label: 'python',
        lang: 'python',
        code: `from openai import OpenAI
from nmafc import SyncNeuromorphicMemory
from nmafc.proxy import MemoryOpenAI

mem = SyncNeuromorphicMemory.from_openai()
client = MemoryOpenAI(mem, client=OpenAI(api_key="sk-..."))

# memory_* keyword arguments are popped by the wrapper, not sent upstream
reply = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Remind me what I said about the lease."}],
    memory_conversation_id="lease-thread",
).choices[0].message.content`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'This is a decorator, not transparent interception',
          body: 'MemoryOpenAI wraps chat.completions.create and is not a subclass of OpenAI, so isinstance checks fail and strictly-typed clients reject the extra memory_* keyword arguments. Everything else delegates through __getattr__. If you want full control and zero surprises, use the root SyncNeuromorphicMemory / NeuromorphicMemory API.',
        },
      },
    ],
  },

  // ---------------------------------------------------------------- hosted products
  {
    id: 'hosted-agents',
    label: 'Agent hosting',
    group: 'Services',
    blocks: [
      {
        t: 'lead',
        text: 'OpenLoft deploys and operates agent harnesses for you. Every one of them reads the same memory — which is the point, not a side effect.',
      },
      {
        t: 'table',
        headers: ['Harness', 'Status', 'Notes'],
        /* Strings derived from the same map the landing band reads — docs
           used to list OpenCode as "Announcing" while the band shipped it,
           which is one claim in every copy-edit except either. */
        rows: [
          ['OpenClaw', 'Available', 'Plugin ecosystem, agent-to-agent mesh, skills and MCP servers. Web UI on its own subdomain.'],
          ['Hermes Agent', 'Available', 'Self-improving skills, cron scheduling, browser automation. OpenAI-compatible gateway + openloft-memory plugin (no A2A mesh).'],
          ['OpenCode', 'Available', 'Open-source terminal agent, any LLM provider. Bring your own provider key, or platform credits.'],
          ['Claude Code', 'Announced', 'Anthropic\u2019s terminal agent, containerised. Bring your own Anthropic key.'],
          ['Codex', 'Announced', 'OpenAI\u2019s coding agent, headless. Bring your own OpenAI key.'],
          ['Gemini CLI', 'Announced', 'Google\u2019s terminal agent. Bring your own Google key.'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Why only terminal agents',
          body: 'The harness has to be a program we can run in a container with a key and a health check. Desktop applications cannot be — Cursor, Windsurf and VS Code are applications on your machine, so they connect to the same memory over MCP instead of being hosted. See MCP — coding agents above.',
        },
      },
      { t: 'h3', text: 'What you get' },
      {
        t: 'list',
        items: [
          'A provisioned container with its own subdomain and TLS.',
          'Secrets pulled at runtime from a per-tenant vault, never as plain environment variables.',
          'Health checks and automatic restart if the process dies.',
          'An agent-to-agent gateway so OpenClaw agents in the same tenant can pair and collaborate.',
          'WireGuard or overlay networking onto the shared memory service.',
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Two concurrent turns on one scope are not coordinated',
          body: 'The turn counter and the decay pass are not locked. One conversation at a time per scope is safe. Parallel writes to a single scope are not.',
        },
      },
    ],
  },

  {
    id: 'hosted-memory',
    label: 'Hosted memory',
    group: 'Services',
    blocks: [
      {
        t: 'lead',
        text: 'The same engine, operated by us. Multi-tenant on our infrastructure, or deployed inside yours.',
      },
      {
        t: 'table',
        headers: ['Format', 'Status', 'What it means'],
        rows: [
          ['Managed, multi-tenant', 'In build', 'One key per tenant, isolation by credential, bounded per-tenant resources. Implemented and tested; not yet deployed in production.'],
          ['Your VPC', 'Announced', 'Managed Helm charts for EKS, GKE and AKS, in your own cloud account.'],
          ['On-premise', 'Announced', 'A container bundle running beside your own inference — vLLM or Ollama. Air-gap installable.'],
          ['Air-gapped / classified', 'Announced', 'Zero network egress. Local embeddings, local models, offline image bundle.'],
        ],
      },
      { t: 'h3', text: 'Enterprise controls — current state' },
      {
        t: 'table',
        headers: ['Control', 'State'],
        rows: [
          ['Tenant isolation bound to a credential', 'In build'],
          ['Bounded per-tenant resources', 'In build'],
          ['SSO / OIDC and role-based access', 'Committed'],
          ['Access audit log with actor identity', 'Committed'],
          ['Right-to-erasure with a certificate', 'Committed'],
          ['Support SLA and named engineer', 'Committed'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Committed is not shipped',
          body: 'The four committed controls are designed and scheduled but not built. If a procurement questionnaire depends on one of them, say so early — the honest answer is that the design exists and the work has not started.',
        },
      },
      { t: 'h3', text: 'Data residency' },
      {
        t: 'p',
        text: 'Content reaches whichever LLM and embedding providers you configure, even in a sovereign deployment. For a genuinely air-gapped setup, use a local model and a local embedder (fastembed/ + ollama/) so nothing crosses the boundary. This is worth raising with a data protection officer early rather than at audit.',
      },
    ],
  },

  {
    id: 'metered-llm',
    label: 'Metered LLM access',
    group: 'Services',
    blocks: [
      {
        t: 'lead',
        text: 'Use our model keys with per-request metering, or bring your own. Either way the same proxy fronts the provider.',
      },
      {
        t: 'list',
        items: [
          'Platform credits: one balance, metered per request, floored at zero rather than allowed to go negative.',
          'Bring your own key: your provider credentials are stored per agent and used directly.',
          'Per-agent switching: change an agent between platform and your own key without redeploying.',
          'One proxy in front of every supported provider, so changing provider is a configuration change.',
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Memory turns cost tokens too',
          body: 'Extraction calls a model on every turn, so a memory turn is billable even when you are not paying for the reply. Meter it as you would any other model call.',
        },
      },
    ],
  },

  // ---------------------------------------------------------------- reference
  {
    id: 'api',
    label: 'API endpoints',
    group: 'Reference',
    blocks: [
      { t: 'h3', text: 'Python public surface (nmafc.__all__)' },
      {
        t: 'p',
        text: 'Import only from the nmafc root (from nmafc import ...). Deep modules (nmafc.engine.*, nmafc.storage.*, nmafc.integration.*) are internal and may change without notice.',
      },
      {
        t: 'table',
        headers: ['Symbol', 'Kind', 'Role'],
        rows: [
          ['NeuromorphicMemory / SyncNeuromorphicMemory', 'Classes', 'Async & blocking memory engines (from_openai, from_env, from_config; plus from_providers on sync).'],
          ['NMafcConfig', 'Pydantic config', 'Top-level configuration (llm_provider_model, embedding_provider_model, agent_id, conversation_id, storage, decay).'],
          ['RecallResult / RememberResult', 'Result models', 'Typed outputs from recall() (context, hits, token_estimate, turn) and remember() (updates_ingested, overrides_suppressed, consolidated, turn).'],
          ['NmafcError & subclasses', 'Exceptions', 'MissingAPIKeyError, MissingExtraError, ProviderNotConfiguredError, StorageError.'],
          ['__version__', 'String', 'Installed package release (mirrors pyproject.toml).'],
        ],
      },
      { t: 'h3', text: 'REST endpoints (nmafc-web)' },
      {
        t: 'table',
        headers: ['Method', 'Path', 'Notes'],
        rows: [
          ['POST', '/v1/memories', 'Ingest a transcript. One LLM call for extraction.'],
          ['POST', '/v1/memories/search', 'Semantic search. Returns score and hop distance.'],
          ['GET', '/v1/memories', 'List records for a tenant.'],
          ['GET', '/v1/memories/{id}', 'One record.'],
          ['PATCH', '/v1/memories/{id}', 'Override a fact. The previous version is retained.'],
          ['DELETE', '/v1/memories/{id}', 'Invalidate a fact. Temporal, not destructive.'],
          ['GET', '/v1/memories/{id}/history', 'Every version of a fact.'],
          ['POST', '/v1/chat/completions', 'OpenAI-compatible with memory. Drops tools — see Integrations.'],
        ],
      },
      { t: 'h3', text: 'Scope' },
      {
        t: 'p',
        text: 'Every record is scoped by agent_id and conversation_id, passed as the X-Agent-Id and X-Conversation-Id headers or in the request body. One Python engine instance is bound to one (agent_id, conversation_id) pair at construction, so calling it with a different scope raises ValueError rather than widening.',
      },
      { t: 'h3', text: 'CLI entry points' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `nmafc init                    # interactive setup wizard (writes .env & verifies first memory)
nmafc chat                    # terminal chat against your memory (requires nmafc[cli])
nmafc-web --host 127.0.0.1    # serve the REST API (requires nmafc[web])
nmafc-mcp                     # stdio MCP server for coding agents (requires nmafc[mcp])
nmafc start                   # repo checkout: backend + Next.js explorer UI together
nmafc eval locomo regenerate  # repo checkout: regenerate the benchmark table from committed data`,
      },
    ],
  },

  {
    id: 'config',
    label: 'Configuration',
    group: 'Reference',
    blocks: [
      {
        t: 'p',
        text: 'Precedence: explicit NMafcConfig argument > environment variables (NMAFC_*) > optional TOML file > library defaults. Without a TOML file, from_openai() and from_env() work out of the box using your platform data directory.',
      },
      {
        t: 'table',
        headers: ['Variable', 'Default', 'Purpose'],
        rows: [
          ['NMAFC_DATA_DIR', 'Platform data dir', 'Root folder for local stores (~/Library/Application Support/nmafc, ~/.local/share/nmafc, %APPDATA%\\nmafc).'],
          ['NMAFC_HOT_URI', '$NMAFC_DATA_DIR/lancedb', 'Hot tier URI; accepts s3://bucket/prefix for S3/R2/MinIO (pass StorageConfig.storage_options for custom endpoints).'],
          ['NMAFC_COLD_URI', '$NMAFC_DATA_DIR/cold.db', 'Cold archive URI; accepts postgresql:// DSN (requires nmafc[postgres]; keyword-only fallback search).'],
          ['NMAFC_EVENT_LOG_URI', '$NMAFC_DATA_DIR/events.db', 'Cognitive event log (local SQLite only by design).'],
          ['NMAFC_LLM_PROVIDER_MODEL', 'openai/gpt-4o-mini', 'Provider/model route for extraction and chat.'],
          ['NMAFC_EMBEDDING_PROVIDER_MODEL', 'openai/text-embedding-3-small', 'Provider/model route for embeddings.'],
          ['NMAFC_EMBEDDING_DIM', '1536', 'Vector width (must match your chosen embedder and existing store).'],
          ['NMAFC_AGENT_ID / NMAFC_CONVERSATION_ID', 'default / default', 'Default tenant and conversation scope.'],
          ['OPENAI_API_KEY / ANTHROPIC_API_KEY / ...', '—', 'Provider credentials read from the environment (plus AZURE_OPENAI_ENDPOINT for Azure).'],
        ],
      },
      { t: 'h3', text: 'Optional TOML configuration' },
      {
        t: 'code',
        label: 'nmafc.toml (optional)',
        lang: 'toml',
        code: `[storage]
# Omit URIs to use the per-user platform directory automatically
agent_id = "default"
conversation_id = "default"
embedding_dim = 1536

[llm]
provider_model = "openai/gpt-4o-mini"

[embedding]
provider_model = "openai/text-embedding-3-small"

[decay]
# how long a working fact stays active. 0.005 gives roughly a 139-turn half-life.
lambda_active_context = 0.005
rerank_top_k = 20      # facts injected into context
hydrate_top_k = 5      # source turns attached behind them`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Decay hyperparameters are frozen for the benchmarked configuration',
          body: 'lambda_active_context sets the half-life of a working memory in conversational turns (0.005 ≈ 139-turn half-life, ~460 turns to demote). Configure models and storage locations first; only tune cognitive constants when running controlled evaluations.',
        },
      },
    ],
  },

  {
    id: 'providers',
    label: 'Providers',
    group: 'Reference',
    blocks: [
      {
        t: 'p',
        text: 'Select models with a "provider/model" string (a bare model name defaults to openai/). Custom provider classes can be injected via SyncNeuromorphicMemory.from_providers(llm, embedder).',
      },
      {
        t: 'table',
        headers: ['Prefix', 'Kind', 'Credentials & extra'],
        rows: [
          ['openai/', 'LLM + embedding', 'OPENAI_API_KEY · nmafc[llm]'],
          ['anthropic/', 'LLM', 'ANTHROPIC_API_KEY · nmafc[llm]'],
          ['azure/ · azure_v1/', 'LLM + embedding', 'AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT · nmafc[llm]'],
          ['bedrock/', 'LLM + embedding', 'AWS credential chain + AWS_REGION · nmafc[aws]'],
          ['groq/ · openrouter/ · together/', 'LLM', 'GROQ_API_KEY / OPENROUTER_API_KEY / TOGETHER_API_KEY · nmafc[llm]'],
          ['ollama/ · lmstudio/ · vllm/', 'LLM (+ ollama embedding)', 'No key (local; OLLAMA_BASE_URL / LMSTUDIO_BASE_URL / VLLM_BASE_URL) · nmafc[llm]'],
          ['fastembed/', 'Embedding only', 'No key (local CPU ONNX) · nmafc[fastembed]'],
        ],
      },
      {
        t: 'p',
        text: 'fastembed/ runs embeddings locally on CPU with no API key (NMAFC_EMBEDDING_DIM=384 for BAAI/bge-small-en-v1.5). To keep conversation transcripts completely inside your network, pair fastembed/ with a local LLM route such as ollama/ or vllm/.',
      },
    ],
  },

  // ---------------------------------------------------------------- how it works
  {
    id: 'architecture',
    label: 'How it works',
    group: 'How it works',
    blocks: [
      {
        t: 'p',
        text: 'A turn goes through the write path; a question goes through the read path.',
      },
      { t: 'h3', text: 'Write' },
      {
        t: 'list',
        items: [
          'The turn is sent to your model with a tool-calling schema, which returns an assistant reply and a set of atomic facts in the same response (or extraction-only via remember()).',
          'Relative dates are resolved to absolute calendar timestamps at this point, so "last week" stops being ambiguous the moment it is stored.',
          'Each fact is given a memory type and a validity interval. A fact that contradicts an existing one supersedes it rather than accumulating.',
          'Facts are written to the archive, then the working set. The archive is never mutated — superseded and invalidated rows are marked, not removed.',
        ],
      },
      { t: 'h3', text: 'Read' },
      {
        t: 'list',
        items: [
          'The question is turned into an embedding and retrieved from the working set, the archive, and along entity links — up to two hops.',
          'Results from each channel are fused by reciprocal rank fusion, which combines ranked lists without needing their scores to be comparable.',
          'The top facts and the turns behind them are assembled into the context, verbatim and compacted, and handed to the model.',
          'Explicit recall() is strictly read-only; process_turn() reinforces what was retrieved and advances the turn counter so unused records fade slightly.',
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Why context stays small',
          body: 'Facts are roughly 32 tokens each, and only a handful of source turns are attached behind them. In our LoCoMo benchmark run, NMAFC averaged 963 prompt tokens per question versus 1,461 for vanilla RAG (−34%).',
        },
      },
    ],
  },

  {
    id: 'benchmarks',
    label: 'Benchmarks',
    group: 'How it works',
    blocks: [
      {
        t: 'p',
        text: 'Evaluated on all 10 LoCoMo conversations (1,985 paired questions across 5 categories), with both arms answering each question in the same execution window against the same persisted stores. You can regenerate the table from committed per-question artifacts in a repository checkout with no API credentials.',
      },
      {
        t: 'code',
        label: 'shell (repo checkout)',
        lang: 'bash',
        code: `nmafc eval locomo regenerate
# or directly:
python scripts/benchmarks/results/paired_2026_09_10/summarise.py`,
      },
      {
        t: 'table',
        headers: ['Category / Metric', 'n', 'NMAFC', 'Vanilla RAG', 'Difference', 'McNemar p'],
        rows: [
          ['Scored core (4 categories)', '1,539', '71.4%', '64.6%', '+6.8', '5.5e-08'],
          ['Temporal', '321', '71.7%', '46.1%', '+25.5', '1.1e-14'],
          ['Multi-hop', '96', '57.3%', '44.8%', '+12.5', '0.0075'],
          ['Single-hop', '281', '50.9%', '45.6%', '+5.3', '0.133 (n.s.)'],
          ['Open-domain', '841', '79.8%', '80.3%', '-0.5', '0.804 (n.s.)'],
          ['Adversarial (category 5)', '446', '35.9%', '50.4%', '-14.6', '4.1e-08'],
          ['All categories (5)', '1,985', '63.4%', '61.4%', '+2.0', '0.085 (n.s.)'],
          ['Mean prompt context', '1,985', '963 tokens', '1,461 tokens', '−34%', '—'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Understanding the scored-core vs 5-category denominator',
          body: 'Published LoCoMo comparisons (Mem0, Zep, MemMachine) score the four standard categories (n = 1,539) because category 5 (Adversarial) ships ordinary factual gold answers on 444 of 446 items rather than refusals. Across those four categories NMAFC leads by +6.8 points (p = 5.5e-08) while spending 34% fewer context tokens, led by temporal (+25.5, p = 1.1e-14) and multi-hop (+12.5, p = 0.0075). We also publish the full 5-category table above including single-hop, open-domain, and adversarial.',
        },
      },
      {
        t: 'p',
        text: 'LoCoMo (Maharana et al., ACL 2024) is licensed CC BY-NC 4.0. Its licence is non-commercial, so the aggregate numbers are reported here for reference and the dataset is not redistributed as a commercial evaluation harness.',
      },
    ],
  },

  {
    id: 'limitations',
    label: 'Limitations',
    group: 'How it works',
    blocks: [
      {
        t: 'p',
        text: 'If you are evaluating this, read this section before you build on it. Every item is a measured or documented limitation, not a hedge.',
      },
      {
        t: 'cards',
        cards: [
          {
            title: 'Forgetting is not erasure',
            body: 'forget_entity, forget_record, and loft_forget invalidate a fact so it stops being retrieved. The write-ahead archive retains the entry and there is no purge path. If you need right-to-erasure semantics, this is not yet it, and you should not describe it as such to a regulator.',
          },
          {
            title: 'Adversarial questions are a weak spot',
            body: 'On LoCoMo category 5 (Adversarial), NMAFC scores 14.6 points below vanilla RAG. Two separate prompt-level fixes were measured and both lowered temporal accuracy, so neither shipped. If your product relies heavily on refusal or adversarial probing, benchmark that workload directly.',
          },
          {
            title: 'The bundled server is not hardened for the internet',
            body: 'nmafc-web explorer endpoints trust a caller-supplied X-Agent-Id header and do not require a key, and the tenant instance cache is unbounded. Fine on localhost; not fine on a shared network. Use it behind your own proxy or use the OpenLoft Memory service.',
          },
          {
            title: 'Decay is conservative in the shipped configuration',
            body: 'At the default lambda_active_context of 0.005 a working fact takes roughly 460 turns to demote. That is deliberate — aggressive decay hurt accuracy on long conversations — so decay is a long-horizon mechanism rather than something you will observe in a short chat.',
          },
          {
            title: 'Concurrent turns on one scope are not coordinated',
            body: 'The turn counter and the decay pass are not locked. Two simultaneous process_turn calls on the same scope can interleave. One conversation at a time per scope is safe; parallel writes to a single scope are not.',
          },
          {
            title: 'PostgreSQL cold fallback & local event log',
            body: 'The PostgreSQL cold backend does not store vectors (cross-archive fallback is keyword-only), and the cognitive event log (NMAFC_EVENT_LOG_URI) is local SQLite only. Additionally, rollback() rebuilds live hot state destructively rather than offering a read-only point-in-time query.',
          },
        ],
      },
    ],
  },
];

/** Flattened text per section, for the search index. */
export function sectionText(s: DocSection): string {
  const parts: string[] = [s.label, s.group];
  for (const b of s.blocks) {
    switch (b.t) {
      case 'p':
      case 'lead':
      case 'h3':
        parts.push(b.text);
        break;
      case 'list':
        parts.push(b.items.join(' '));
        break;
      case 'code':
        parts.push(b.label, b.code);
        break;
      case 'table':
        parts.push(b.headers.join(' '), b.rows.map((r) => r.join(' ')).join(' '));
        break;
      case 'callout':
        parts.push(b.callout.title, b.callout.body);
        break;
      case 'cards':
        parts.push(b.cards.map((c) => `${c.title} ${c.body}`).join(' '));
        break;
    }
  }
  return parts.join(' ').toLowerCase();
}
