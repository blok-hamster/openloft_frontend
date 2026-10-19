'use client';

import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import styles from './IntegrationGuide.module.css';

interface IntegrationGuideProps {
  /** The freshly-minted key. Present only until the page is reloaded. */
  apiKey: string;
  label: string;
  scopes: string[];
}

/**
 * The config a user actually pastes into their client.
 *
 * Written as a tab picker rather than every block at once: three blocks of JSON
 * and shell is a wall, and a user integrating Claude Code does not want to read
 * a Mem0 example to find it.
 *
 * The endpoint is the platform's, not the substrate's. The substrate is not
 * published — it is reachable only inside the Docker network — so there is no
 * correct public URL for it to advertise.
 */
export default function IntegrationGuide({ apiKey, label, scopes }: IntegrationGuideProps) {
  const [tab, setTab] = useState<'mcp' | 'rest' | 'openai'>('mcp');
  const [copied, setCopied] = useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3001/api';

  const blocks = useMemo<Record<string, { title: string; note: string; body: string }>>(
    () => ({
      mcp: {
        title: 'MCP — Claude Code, Cursor, Codex',
        note:
          'Add this to your MCP client config. The host authenticates with your session, so the ' +
          'key stays on the platform and never enters the client.',
        body: JSON.stringify(
          {
            mcpServers: {
              openloft: {
                type: 'http',
                url: `${base}/memory/mcp`,
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
              },
            },
          },
          null,
          2,
        ),
      },
      rest: {
        title: 'REST — any language',
        note:
          'Mem0-compatible, so a client already built against Mem0 changes only the base URL and ' +
          'the key.',
        body: [
          `# Store a turn`,
          `curl -X POST ${base}/memory/remember \\`,
          `  -H "Authorization: Bearer ${apiKey}" \\`,
          `  -H "Content-Type: application/json" \\`,
          `  -d '{"messages":[{"role":"user","content":"${label}"}]}'`,
          ``,
          `# Retrieve`,
          `curl -X POST ${base}/memory/recall \\`,
          `  -H "Authorization: Bearer ${apiKey}" \\`,
          `  -H "Content-Type: application/json" \\`,
          `  -d '{"query":"what did we agree on?","top_k":10}'`,
        ].join('\n'),
      },
      openai: {
        title: 'OpenAI-compatible — SDK swap-in',
        note:
          'Point an OpenAI SDK at this base URL. The passthrough drops tools and tool_choice, so ' +
          'a tool-calling client must use MCP or REST instead.',
        body: [
          `from openai import OpenAI`,
          ``,
          `client = OpenAI(`,
          `    base_url="${base}/memory/openai/v1",`,
          `    api_key="${apiKey}",`,
          `)`,
        ].join('\n'),
      },
    }),
    [apiKey, base, label],
  );

  const current = blocks[tab];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop: the block is on screen and selectable, so a failed clipboard
         write is not worth an error toast */
    }
  };

  return (
    <section className={styles.wrap}>
      <h3 className={styles.heading}>Connect your application</h3>

      <div className={styles.tabs} role="tablist" aria-label="Integration method">
        {(Object.keys(blocks) as ('mcp' | 'rest' | 'openai')[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => setTab(id)}
          >
            {blocks[id].title}
          </button>
        ))}
      </div>

      <p className={styles.note}>{current.note}</p>

      <div className={styles.codeWrap}>
        <pre className={styles.code}>{current.body}</pre>
        <Button
          variant={copied ? 'secondary' : 'primary'}
          size="sm"
          icon={copied ? <Check size={13} /> : <Copy size={13} />}
          onClick={copy}
          className={styles.copyBtn}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <p className={styles.scopeNote}>
        Scopes granted: <code>{scopes.join(', ') || 'none'}</code>
      </p>
    </section>
  );
}
