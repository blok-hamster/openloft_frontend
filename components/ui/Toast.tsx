'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, variant }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const variantClass: Record<ToastVariant, string> = {
        success: styles.toastSuccess,
        error: styles.toastError,
        info: styles.toastInfo,
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className={styles.toastContainer}>
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
