import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

import { HARNESS_NAMES } from '@/components/dashboard/AgentTypeSelector';

const ROOT = process.cwd();

/**
 * Interactive terminal wiring.
 *
 * These are static checks because the properties that matter are about what
 * the code *does*, not what it renders: every one of them corresponds to a
 * defect in the abandoned first attempt at this feature, and each would pass a
 * smoke test that only checked the modal opened.
 */

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('socket handshake auth', () => {
    const socket = stripComments(read('lib/socket.ts'));

    it('sends the JWT in the handshake auth payload', () => {
        // The backend runs io.use() and rejects a socket with no token, so
        // an anonymous io() never fires `connect`.
        expect(socket).toMatch(/auth:\s*token\s*\?\s*\{\s*token\s*\}/);
    });

    it('reads the token from the same storage key the axios interceptor uses', () => {
        // Two keys means one of them is wrong after a re-login.
        const api = read('lib/api.ts');
        expect(socket).toContain("localStorage.getItem(TOKEN_STORAGE_KEY)");
        expect(api).toContain("localStorage.getItem('loft_token')");
    });

    it('has no page calling io() without credentials', () => {
        const pages = [
            'app/dashboard/agents/page.tsx',
            'app/dashboard/lobby/[lobbyId]/page.tsx',
        ];
        for (const page of pages) {
            const src = stripComments(read(page));
            expect(src, `${page} still constructs a bare io()`).not.toMatch(/\bio\(/);
            expect(src, `${page} must use the authenticated factory`).toMatch(/createSocket\(\)/);
        }
    });
});

describe('terminal relay contract', () => {
    const modal = stripComments(read('components/dashboard/TerminalModal.tsx'));

    it('mints a token before asking the backend to open the relay', () => {
        // The relay grants a shell only for a one-time token it can verify, and
        // the token is consumed on first use, so a mint must precede every open.
        expect(modal).toMatch(/requestTerminalToken\(agentId\)/);
        expect(modal).toMatch(/emit\('terminal:open'/);
        expect(modal.indexOf('requestTerminalToken(')).toBeLessThan(modal.indexOf("emit('terminal:open'"));
    });

    it('forwards the token in the open payload, not just the agentId', () => {
        expect(modal).toMatch(/emit\('terminal:open',\s*\{\s*agentId,\s*token\s*\}\)/);
    });

    it('routes keystrokes to the relay as terminal:input', () => {
        expect(modal).toMatch(/emit\('terminal:input',\s*\{\s*agentId,\s*data\s*\}\)/);
    });

    it('closes the relay when the dialog closes', () => {
        // The relay is single-session: leaving it open makes the next open fail.
        expect(modal).toMatch(/emit\('terminal:close'/);
    });

    it('does not read or render the agent credential', () => {
        // A terminal grant must not become a path to the gateway token.
        expect(modal).not.toMatch(/getAgentCredentials/);
        expect(modal).not.toMatch(/gatewayToken/);
    });

    it('opts out of the modal default width and internal scrolling', () => {
        // The default 560px modal wraps a PTY early, and the default
        // overflow-y:auto nests a scroll container inside a scroll container.
        expect(modal).toMatch(/width=\{860\}/);
        expect(modal).toMatch(/scrollBody/);
    });
});

describe('socket lifecycle', () => {
    const modal = stripComments(read('components/dashboard/TerminalModal.tsx'));

    it('holds the socket in a ref, not state', () => {
        // Keying the connect effect on a `socket` state value re-runs it on the
        // render that sets that state, and its cleanup disconnects — one socket
        // per render instead of one per session. A ref breaks that loop, and
        // nothing here renders against the socket.
        expect(modal).toMatch(/useRef<Socket \| null>\(null\)/);
        // Catches any spelling of the same mistake, not just one type spelling.
        expect(modal, 'a socket in state would churn on every render').not.toMatch(
            /const\s*\[socket,\s*setSocket\]/
        );
    });

    it('keys the connect effect on the agentId string, not the agent object', () => {
        // The agents page replaces its rows on every 3s poll, so depending on
        // object identity would rebuild the PTY session mid-conversation.
        expect(modal).toMatch(/const agentId = agent\?\.agentId/);
        expect(modal).not.toMatch(/\}, \[open, agent[,\]]/);
    });

    it('takes the socket as an argument rather than closing over state', () => {
        expect(modal).toMatch(/openRelay = useCallback\(async \(socket: Socket\)/);
        expect(modal).toMatch(/void openRelay\(socket\)/);
    });

    it('disconnects and clears the ref on cleanup', () => {
        expect(modal).toMatch(/socket\.disconnect\(\)/);
        expect(modal).toMatch(/socketRef\.current = null/);
    });
});

describe('terminal button gating', () => {
    const card = stripComments(read('components/dashboard/AgentCard.tsx'));

    it('no longer mounts a terminal entry point on the agent card', () => {
        // The interactive shell came off the card with its chat, workspace,
        // drive and channels siblings while those surfaces are reworked.
        // TerminalModal remains as a component with its own contract tests;
        // if the entry point returns, this assertion flips with it.
        expect(card).not.toMatch(/onTerminal/);
    });
});

// ---------------------------------------------------------------------------
// Harness registry-driven UI
// ---------------------------------------------------------------------------

describe('harness presentation', () => {
    const selector = read('components/dashboard/AgentTypeSelector.tsx');

    it('does not branch the picker on a harness name', () => {
        // The picker used to be two hardcoded cards. Branching on
        // `agentType === 'hermes'` here is how a third harness ended up needing
        // six edits across the wizard, card, credentials and chat panel.
        expect(selector).not.toMatch(/agentType === 'hermes'/);
        expect(selector).toMatch(/harnesses\.map\(withCopy\)/);
    });

    it('exposes a display name for every harness the API can return', () => {
        // A harness without copy renders as its raw type, which is a card that
        // looks broken. The API can return any value in its enum, and
        // `HarnessType` in lib/api.ts is this side's mirror of that enum — so it
        // is the list that has to be covered. Read from the frontend's own file
        // rather than reaching into backend/ so this stays a frontend invariant.
        const api = read('lib/api.ts');
        const union = api.match(/export type HarnessType =([^;]+);/)?.[1];
        expect(union, 'cannot find HarnessType').toBeTruthy();
        const types = union!.match(/'[a-z-]+'/g)!.map((s) => s.replace(/'/g, ''));

        expect(types).toEqual(['openclaw', 'hermes', 'opencode', 'claude-code', 'codex']);

        for (const type of types) {
            expect(
                HARNESS_NAMES[type],
                `AgentTypeSelector has no display name for "${type}"`
            ).toBeTruthy();
        }
    });

    it('marks harnesses the operator has not enabled, rather than hiding them', () => {
        // A hidden card reads as a missing feature; a disabled one reads as a
        // deliberate policy.
        expect(selector).toMatch(/optionCardDisabled/);
        expect(selector).not.toMatch(/filter\(\s*\(h\)\s*=>\s*h\.selectable\s*\)/);
    });
});

describe('chat panel framing', () => {
    const chat = read('components/dashboard/AgentChatPanel.tsx');

    it('decides framing from the credential shape, not the harness name', () => {
        // OpenCode's server is HTTP Basic only, and a frame cannot send that
        // header — so there is nothing to embed. Branching on the credential's
        // own discriminator means a harness that later gains a query-token mode
        // becomes framable with no change here.
        expect(chat).toMatch(/webUi\?\.auth === 'query'/);
        expect(chat).not.toMatch(/agent\.agentType === 'hermes'/);
    });

    it('explains itself instead of rendering a frame that will 401', () => {
        expect(chat).toMatch(/chatUnframable/);
        expect(chat).toMatch(/cannot send credentials/);
    });
});
