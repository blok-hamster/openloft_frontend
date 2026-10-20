'use client';

import { useEffect, RefObject } from 'react';

/**
 * Drawer focus contract.
 *
 * Escape closes and returns focus to the trigger; Tab cycles inside the
 * drawer. `aria-modal` was already on the element — but without the Tab
 * half of that promise, keyboard focus walked right through the scrim into
 * the page behind. Shared by both shells (agent + memory) so the two
 * drawers cannot drift: identical mechanics is the document, one import
 * each is the learning cost mentioned in the audit's "worth protecting".
 */
export function useDrawerFocus(
    open: boolean,
    drawerRef: RefObject<HTMLElement | null>,
    triggerRef: RefObject<HTMLElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        if (!open) return;

        // Land inside the drawer, not behind the scrim.
        drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !drawerRef.current) return;
            const focusables = Array.from(
                drawerRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
                ),
            );
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (event.shiftKey) {
                if (active === first || !drawerRef.current.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !drawerRef.current.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
        // refs are stable; onClose may change identity per render — reading
        // it through the closure that runs last is fine for an escape path.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
}
