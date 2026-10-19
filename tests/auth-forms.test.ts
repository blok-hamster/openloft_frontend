import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/**
 * The auth forms could not be submitted.
 *
 * Both pages render their submit control as `<Button type="button">` inside a
 * `<form onSubmit={...}>`. A `type="button"` does not submit its form, so
 * neither a click on "Sign In" nor Enter in a field ever reached the handler:
 * signup and sign-in were both unreachable, on the two routes that exist for
 * them.
 *
 * TypeScript and ESLint both accept the bug — `type` is an ordinary string prop
 * on a component that spreads `ButtonHTMLAttributes`, and "button" is a
 * perfectly legal button type — so a test is the only thing that catches it
 * coming back.
 */

const PAGES = ['app/auth/login/page.tsx', 'app/auth/register/page.tsx'];

function read(rel: string): string {
    return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Every <form>…</form> body in the file, in document order. */
function formBodies(src: string): string[] {
    return [...src.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map((m) => m[1]);
}

describe('auth form submission', () => {
    it.each(PAGES)('%s renders its in-form submit control as type="submit"', (rel: string) => {
        const bodies = formBodies(read(rel));

        // Guard the guard: a page whose forms stopped parsing would otherwise
        // pass by checking nothing at all.
        expect(bodies).toHaveLength(2);

        for (const body of bodies) {
            const buttons = body.match(/<Button\b[^>]*>/g) ?? [];
            expect(buttons).toHaveLength(1);
            for (const button of buttons) {
                expect(button).toMatch(/type="submit"/);
            }
        }
    });

    it.each(PAGES)('%s never renders a Button as type="button"', (rel: string) => {
        // The exact shape of the bug, kept out of the file for good.
        expect(read(rel)).not.toMatch(/<Button\b[^>]*type="button"/);
    });

    it.each(PAGES)('%s keeps its secondary buttons as type="button"', (rel: string) => {
        // Resend and "Use a different account" own their click rather than
        // submitting anything. Promoting them to submit controls would post the
        // form — the opposite failure to the one above.
        const src = read(rel);
        expect(src).toMatch(/<button\s+type="button"\s+className=\{styles\.resendButton\}/);
        expect(src).toMatch(/<button type="button" className=\{styles\.backToForm\}/);
    });

    it.each(PAGES)('%s wires both forms to their handlers', (rel: string) => {
        // A submit button with no onSubmit would pass everything above.
        const forms = read(rel).match(/<form\b[^>]*>/g) ?? [];
        expect(forms).toHaveLength(2);
        for (const form of forms) {
            expect(form).toMatch(/onSubmit=\{handle(Submit|Verify)\}/);
        }
    });
});
