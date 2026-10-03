/**
 * Documentation content for the open-source framework section.
 *
 * Content is data, not JSX, so the search index and the rendered page read from
 * one source. Adding a section means adding an entry here plus a nav group
 * label in `page.tsx`.
 *
 * Claim discipline (MEMORY_PLATFORM_IMPLEMENTATION_PLAN.md R6): this page is an
 * external claim surface and is held to the same standard as README.md. Every
 * limitation stated below is real and measured, and none of them is softened
 * because it is inconvenient to sell. If a capability is pending, the copy says
 * pending.
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

export const GROUPS = ['Getting started', 'Integrations', 'Reference', 'How it works'] as const;

export const SECTIONS: DocSection[] = [
  // ---------------------------------------------------------------- getting started
  {
    id: 'overview',
    label: 'Overview',
    group: 'Getting started',
    blocks: [
      {
        t: 'lead',
        text: 'NMAFC is an open-source memory layer for LLM agents. It is the engine behind OpenLoft Memory, and you can run it yourself — the whole thing is Apache-2.0.',
      },
      {
        t: 'p',
        text: 'It exists to solve one problem: assistants that forget. Rather than stuffing raw transcripts into a vector database and paying for repeated summarisation passes, NMAFC compacts each turn into atomic facts with resolved absolute dates at write time, lets unused facts fade on a decay curve, and retrieves through a fusion of five ranked channels.',
      },
      { t: 'h3', text: 'What you get' },
      {
        t: 'table',
        headers: ['Capability', 'What it does'],
        rows: [
          ['Temporal grounding', 'Resolves "last week" to a real date when the fact is written, so a question about dates can be answered precisely later.'],
          ['Decay and reinforcement', 'Facts fade with conversational turns; every retrieval strengthens retention. Frequently-used facts persist, one-off noise expires.'],
          ['Three memory types', 'CoreAnchor (identity and immutable rules, never decay), ActiveContext (current state), EphemeralState (session noise).'],
          ['Dual-tier storage', 'A small working set in LanceDB plus an append-only archive in SQLite with a full-text index. No external vector database to run.'],
          ['Graph retrieval', 'Entity links are resolved on ingest, so multi-hop questions traverse relationships rather than relying on similarity alone.'],
          ['Source attribution', 'Every fact points at the turns it was extracted from, so you can show a user why the assistant believes something.'],
          ['Several ways to connect', 'Python SDK, REST, MCP, and an OpenAI-compatible endpoint. See Integrations below.'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'It is a library first',
          body: 'NMAFC is a Python package with an HTTP server attached. If you can import a package, you can use it. Nothing requires you to adopt OpenLoft, and nothing requires an LLM provider from us.',
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
        text: 'Python 3.11 or newer. Two supported routes — a local library, or the HTTP server.',
      },
      { t: 'h3', text: 'As a library' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `git clone https://github.com/blok-hamster/nmafc.git
cd nmafc

# a virtualenv is worth it; the engine pins LanceDB tightly
uv venv && source .venv/bin/activate     # or: python -m venv .venv && source .venv/bin/activate

# pick the extras you need
uv sync --extra all                      # or: pip install -e ".[llm]"
uv run pytest -q                         # 833 tests, about 30s, no network`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'The extraction step needs tool-calling',
          body: 'Facts are extracted by asking your model to call a tool. A provider without tool-calling can serve recall but cannot write memory, so the engine will look healthy and quietly remember nothing. Every provider listed on this page supports it; check yours does.',
        },
      },
      { t: 'h3', text: 'As a server' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `# the engine ships its own server: an explorer UI plus a REST API
uv run nmafc-web --host 127.0.0.1 --port 8000

# then read the interactive API surface
open http://127.0.0.1:8000/docs`,
      },
      {
        t: 'p',
        text: 'Bind to localhost unless you have put authentication in front of it. The bundled server ships with its explorer endpoints open — see the security note below before exposing it.',
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Before you expose it to a network',
          body: 'Out of the box the server\'s explorer endpoints trust an X-Agent-Id header and do not require a key, and the tenant instance cache is unbounded. On a shared network that is a cross-tenant read and a denial-of-service surface. Either run it on localhost behind your own proxy, or use the OpenLoft Memory service, which binds the tenant to a credential and bounds the cache.',
        },
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
        text: 'The shortest useful path. Construct a memory, give it a turn, recall what it kept.',
      },
      {
        t: 'code',
        label: 'python',
        lang: 'python',
        code: `import asyncio
from nmafc.wrapper import NeuromorphicMemory
from nmafc.integration.factory import create_llm_provider, create_embedding_provider

async def main():
    memory = NeuromorphicMemory(
        llm_provider=create_llm_provider("openai/gpt-4o-mini"),
        embedding_provider=create_embedding_provider("openai/text-embedding-3-small"),
    )

    # one turn: recall, generate with the facts injected, then write what it learned
    reply = await memory.process_turn("I run a bike shop in Lisbon.")
    reply = await memory.process_turn("Which city am I in?")

    # read-only retrieval — performs no writes and no reinforcement
    result = await memory.recall("where is the shop?")
    print(result.context)

    memory.close()

asyncio.run(main())`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'good',
          title: 'Use process_turn, not remember-then-recall',
          body: 'A turn fuses fact extraction into the same LLM call that produces the reply. Calling remember() and recall() separately costs a second LLM round trip per turn, because extraction then has nothing to fuse with. process_turn is one call; the split path is two.',
        },
      },
      { t: 'h3', text: 'Synchronous code' },
      {
        t: 'code',
        label: 'python',
        lang: 'python',
        code: `from nmafc.wrapper import SyncNeuromorphicMemory

memory = SyncNeuromorphicMemory.from_config()
memory.process_turn_sync("I prefer Postgres over Mongo.")
context = memory.recall("what database do I prefer?")
memory.close()`,
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
        text: 'Four ways in. They reduce to one decision: how much of your request loop do you want to hand over.',
      },
      {
        t: 'table',
        headers: ['Integration', 'Use it when', 'Cost', 'Tool-calling safe'],
        rows: [
          ['Python SDK', 'You own the application and want the tightest integration.', 'Lowest — one LLM call per turn.', 'Yes'],
          ['REST (/v1/memories)', 'You are not Python, or you want a service boundary.', 'Two calls per turn if you split it; one if you use /chat.', 'Yes'],
          ['MCP (stdio)', 'You want zero code change in a coding agent.', 'One call per turn.', 'Yes'],
          ['OpenAI endpoint (/v1/chat/completions)', 'You only want to change a base URL.', 'Two calls per turn.', 'No — see below'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'The OpenAI-compatible endpoint drops tools',
          body: 'POST /v1/chat/completions forwards a fixed allow-list of sampling parameters. tools, tool_choice and parallel_tool_calls are not on it, so tool-calling clients break when pointed at it. If your harness uses tools, use the explicit remember/recall surface or MCP instead. This is a known limitation of the passthrough, not something you have configured wrong.',
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
        text: 'The zero-code-change path. The MCP server exposes six tools over stdio, so any MCP host can use NMAFC without your writing integration code.',
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
        label: '.mcp.json',
        lang: 'json',
        code: `{
  "mcpServers": {
    "memory": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/nmafc", "nmafc-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "NMAFC_HOT_URI": "/path/to/nmafc/data/lancedb",
        "NMAFC_COLD_URI": "/path/to/nmafc/data/cold.db"
      }
    }
  }
}`,
      },
      { t: 'h3', text: 'Cursor' },
      {
        t: 'code',
        label: '.cursor-mcp.json',
        lang: 'json',
        code: `{
  "mcpServers": {
    "memory": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/nmafc", "nmafc-mcp"]
    }
  }
}`,
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Launch it from the repository root',
          body: 'The server reads config from configs/default.toml relative to the working directory. Started from anywhere else it silently falls back to library defaults, which usually means a different data directory than you expect.',
        },
      },
      {
        t: 'p',
        text: 'Codex uses the same JSON shape in .codex-mcp.json. Any other MCP host takes the same command and environment.',
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
        text: 'If your stack is already OpenAI-shaped, MemoryOpenAI wraps an existing client and interposes memory on chat completion. It remembers on the way out and recalls on the way in.',
      },
      {
        t: 'code',
        label: 'python',
        lang: 'python',
        code: `import openai
from nmafc.proxy import MemoryOpenAI
from nmafc.wrapper import SyncNeuromorphicMemory

client = MemoryOpenAI(
    openai.OpenAI(api_key="sk-..."),
    memory=SyncNeuromorphicMemory.from_config(),
)

# extra keyword arguments are consumed by the wrapper, not sent upstream
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
          body: 'MemoryOpenAI wraps one method on chat.completions and is not a subclass, so isinstance checks against the OpenAI SDK fail and strictly-typed clients reject the extra keyword arguments. Everything else passes through untouched. If you need real transparency, the explicit SDK is less surprising.',
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
        text: 'Every record is scoped by agent_id and conversation_id, passed as the X-Agent-Id and X-Conversation-Id headers or in the request body. One engine instance is bound to one pair, so a memory object cannot be used to read a different scope — it raises rather than widening.',
      },
      { t: 'h3', text: 'CLI' },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `nmafc start        # serve the API and the explorer UI
nmafc init         # interactive setup wizard
nmafc chat         # terminal chat against your memory
nmafc eval locomo summarise   # regenerate the benchmark table from committed data`,
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
        text: 'A TOML file, or environment variables. Environment variables win.',
      },
      {
        t: 'code',
        label: 'configs/default.toml',
        lang: 'toml',
        code: `[storage]
hot_uri = "./data/lancedb"      # working set
cold_uri = "./data/cold.db"     # append-only archive
embedding_dim = 1536
agent_id = "default"
conversation_id = "default"

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
        t: 'table',
        headers: ['Variable', 'Purpose'],
        rows: [
          ['NMAFC_HOT_URI / NMAFC_COLD_URI', 'Storage locations. The hot tier also accepts an s3:// URI.'],
          ['NMAFC_LLM_PROVIDER_MODEL', 'Provider and model for extraction and generation.'],
          ['NMAFC_EMBEDDING_PROVIDER_MODEL', 'Embedding provider.'],
          ['NMAFC_EMBEDDING_DIM', 'Embedding width. Probed at boot if unset.'],
          ['OPENAI_API_KEY / ANTHROPIC_API_KEY', 'Credentials, read from the environment only.'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Tuning decay is the highest-leverage change',
          body: 'lambda_active_context sets the half-life of a working memory in conversational turns. Raising it makes the engine remember longer and decay less. It is the setting most worth understanding before you change anything else.',
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
        t: 'table',
        headers: ['Provider', 'Kind', 'Needs a key'],
        rows: [
          ['openai', 'LLM + embedding', 'Yes'],
          ['anthropic', 'LLM', 'Yes'],
          ['azure-openai', 'LLM + embedding', 'Yes'],
          ['bedrock', 'LLM + embedding', 'AWS credentials or an API key'],
          ['groq, openrouter, together', 'LLM + embedding', 'Yes'],
          ['ollama, lmstudio, vllm', 'LLM + embedding', 'No — local inference'],
          ['fastembed', 'Embedding only', 'No — runs locally'],
        ],
      },
      {
        t: 'p',
        text: 'fastembed is worth knowing about if conversation content must not leave your boundary: it runs a small embedding model locally with no network call.',
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
          'The turn is sent to your model with a tool-calling schema, which returns an assistant reply and a set of atomic facts in the same response.',
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
          'Retrieving strengthens what was retrieved, and the turn counter advances so everything fades slightly.',
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'note',
          title: 'Why context stays small',
          body: 'Facts are roughly 32 tokens each, and only a handful of source turns are attached behind them. That is why a memory layer can answer questions across many sessions without the prompt growing with the transcript.',
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
        text: 'On the LoCoMo benchmark of 1,985 conversational questions, both arms answering each question in the same execution window. You can regenerate the table yourself with one command and no API credentials.',
      },
      {
        t: 'code',
        label: 'shell',
        lang: 'bash',
        code: `python scripts/benchmarks/results/paired_2026_09_10/summarise.py`,
      },
      {
        t: 'table',
        headers: ['Category', 'n', 'NMAFC', 'Vanilla RAG', 'Difference'],
        rows: [
          ['Temporal', '321', '71.7%', '46.1%', '+25.5'],
          ['Multi-hop', '96', '57.3%', '44.8%', '+12.5'],
          ['Single-hop', '281', '50.9%', '45.6%', '+5.3'],
          ['Open-domain', '841', '79.8%', '80.3%', '-0.5'],
          ['Adversarial', '446', '35.9%', '50.4%', '-14.6'],
          ['All categories', '1,985', '63.4%', '61.4%', '+2.0'],
        ],
      },
      {
        t: 'callout',
        callout: {
          kind: 'warn',
          title: 'Read the p-values, not the headline',
          body: 'The overall +2.0 is not statistically significant (p=0.085), and neither is the +5.3 on single-hop (p=0.133). The result that holds is temporal: +25.5 at p≈1e-14. The +6.8 on the scored set is largely the same finding seen from another angle — remove the temporal questions and it drops to +1.9 (p=0.165). We publish the losses because a benchmark that only shows wins is marketing, not evidence.',
        },
      },
      {
        t: 'p',
        text: 'LoCoMo is licensed CC BY-NC 4.0. Its licence is non-commercial, so the aggregate numbers are reported here for reference and the dataset is not redistributed as a commercial evaluation harness.',
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
            body: 'forget_entity and forget_record invalidate a fact so it stops being retrieved. The write-ahead archive retains the entry and there is no purge path. If you need right-to-erasure semantics, this is not yet it, and you should not describe it as such to a regulator.',
          },
          {
            title: 'Unanswerable questions are a weak spot',
            body: 'On false-premise questions NMAFC scores 14.6 points below vanilla RAG, and it will sometimes answer a question it should have declined. Two separate prompt-level fixes were measured and both made temporal accuracy worse, so this is not resolved. If your product needs reliable refusal, measure it yourself.',
          },
          {
            title: 'The bundled server is not hardened for the internet',
            body: 'The explorer endpoints trust a caller-supplied X-Agent-Id header and do not require a key, and the tenant instance cache is unbounded. Fine on localhost; not fine on a shared network. Use it behind your own proxy or use the OpenLoft Memory service.',
          },
          {
            title: 'Decay is conservative in the shipped configuration',
            body: 'At the default lambda_active_context of 0.005 a working fact takes roughly 460 turns to demote. That is deliberate — the aggressive default was measured and discarded — but it means decay is a long-horizon mechanism, not something you will observe in a short conversation.',
          },
          {
            title: 'Concurrent turns on one scope are not coordinated',
            body: 'The turn counter and the decay pass are not locked. Two simultaneous process_turn calls on the same scope can interleave. One conversation at a time per scope is safe; parallel writes to a single scope are not.',
          },
          {
            title: 'No point-in-time reconstruction',
            body: 'There is a rollback that rebuilds the working set from the archive, but it is lossy and it mutates live state. A read-only "what did the agent know at turn T" does not exist yet.',
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