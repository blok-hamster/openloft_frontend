'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    return (
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
                        aria-label={title}
                        tabIndex={-1}
                        style={width !== undefined ? { maxWidth: width } : undefined}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {title && (
                            <div className={styles.modalHeader}>
                                <span className={styles.modalTitle}>{title}</span>
                                <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        <div className={styles.modalBody}>{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
