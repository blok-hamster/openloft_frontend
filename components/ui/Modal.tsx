'use client';

import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './UI.module.css';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    /**
     * Overrides the default 560px cap.
     *
     * Only the interactive terminal needs this, and it is not cosmetic: a PTY
     * at 560px wraps at column 80 and an agent's shell output becomes
     * unreadable. Everything else keeps the default.
     */
    width?: number | string;
    /**
     * Let the content own its scrolling.
     *
     * `.modalContent` is `overflow-y: auto`, which is right for a form and
     * wrong for xterm: a nested scroll container inside a scroll container
     * gives two scrollbars and makes the terminal mis-size on every resize.
     */
    scrollBody?: boolean;
}

export default function Modal({ open, onClose, title, children, width, scrollBody }: ModalProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);

    /* The visible title heading is the dialog's name (aria-labelledby),
       not a string copy of it (aria-label) — screen readers then read the
       heading the sighted reader sees, and the two can never drift. */
    const titleId = useId();

    /* In-DOM overlays used to inherit the nearest stacking context: inside
       a table cell, a card or anything with its own transform, the modal
       painted below siblings with a higher z-index. The portal mounts the
       overlay at the document root, where nothing outranks it. The host is
       captured once on first open and kept — it must survive the close so
       AnimatePresence can play its exit animation inside the portal. */
    const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
    if (open && !portalHost && typeof document !== 'undefined') {
        setPortalHost(document.body);
    }

    /* Bottom sheets (≤900px) answer the grab handle they draw: horizontal
       X is not the only close affordance on a phone. The gesture listens
       only on the grab strip — drags inside the body still scroll the
       sheet, and on desktop `drag` stays off entirely. */
    const dragControls = useDragControls();
    const [isBottomSheet, setIsBottomSheet] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 900px)');
        const sync = () => setIsBottomSheet(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const handleDragEnd = (
        _event: unknown,
        info: { offset: { y: number }; velocity: { y: number } },
    ) => {
        const height = contentRef.current?.offsetHeight ?? 0;
        /* A quarter of the sheet's height, or a decisive flick, reads as
           "put this away" — anything less springs back instead of closing
           on an accidental pull. */
        if (info.offset.y > height * 0.25 || info.velocity.y > 400) {
            onCloseRef.current();
        }
    };

    /* Every call site passes an inline arrow (`onClose={() => setX(null)}`),
       so `onClose` is a new function on every parent render. Reading it
       through a ref keeps it current without putting it in the dependency
       array below: depending on it re-ran the effect — and its cleanup —
       on every socket event and poll tick, which re-captured the previous
       focus target and yanked focus back out of the dialog. */
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;

        previousFocus.current = document.activeElement as HTMLElement | null;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab') return;

            /* Minimal focus trap: without this, Tab walks out of the dialog
               into the page behind it. */
            const focusables = contentRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusables?.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        /* Defer so focus lands after the dialog has actually mounted. */
        const raf = requestAnimationFrame(() => {
            contentRef.current?.focus();
        });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prevOverflow;
            cancelAnimationFrame(raf);
            previousFocus.current?.focus();
        };
    }, [open]);

    if (!open && !portalHost) return null;

    return (
        <>
            {portalHost &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                className={styles.modalOverlay}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={onClose}
                            >
                                <motion.div
                                    ref={contentRef}
                                    className={scrollBody ? `${styles.modalContent} ${styles.modalContentFlush}` : styles.modalContent}
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby={title ? titleId : undefined}
                                    aria-label={title ? undefined : 'Dialog'}
                                    tabIndex={-1}
                                    style={width !== undefined ? { maxWidth: width } : undefined}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={(e) => e.stopPropagation()}
                                    drag={isBottomSheet ? 'y' : false}
                                    dragListener={false}
                                    dragControls={dragControls}
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={{ top: 0, bottom: 0.7 }}
                                    dragMomentum={false}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* The drag strip: a real element over the decorative
                                        handle, touch-action:none so the gesture belongs
                                        to the sheet and never to the page. Keyboard
                                        users dismiss with Escape or the 44px close —
                                        this strip is an extra, not the affordance. */}
                                    <div
                                        className={styles.modalGrab}
                                        onPointerDown={(event) => dragControls.start(event)}
                                        aria-hidden="true"
                                    />
                                    {title && (
                                        <div className={styles.modalHeader}>
                                            <span className={styles.modalTitle} id={titleId}>
                                                {title}
                                            </span>
                                            <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                    <div className={styles.modalBody}>{children}</div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    portalHost,
                )}
        </>
    );
}
