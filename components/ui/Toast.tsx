'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './UI.module.css';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastContextType {
    toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

let toastId = 0;

const TOAST_TTL = 4000;
/* Screen space is scarce on a phone — a stack of nine toasts would cover
   the content the user was just told about. */
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    /* Timers were previously never cleared, so every toast left a pending
       timeout that fired setState after unmount. */
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, variant }].slice(-MAX_VISIBLE));

        const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timers.current = timers.current.filter((t) => t !== timer);
        }, TOAST_TTL);
        timers.current.push(timer);
    }, []);

    const variantClass: Record<ToastVariant, string> = {
        success: styles.toastSuccess,
        error: styles.toastError,
        info: styles.toastInfo,
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* aria-live so failures are announced rather than only shown.
                assertive for errors would be better but the variant lives on
                each child, so the whole stack shares one polite region. */}
            <div className={styles.toastContainer} role="status" aria-live="polite" aria-atomic="false">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            className={variantClass[t.variant]}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
