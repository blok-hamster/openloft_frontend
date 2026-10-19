'use client';

import { ReactNode, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';

interface ConfirmDestructiveActionProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    confirmText: string;
    loading?: boolean;
    /** Optional explanation of what the action actually does, shown above the
     *  warning. Use it when the action's name understates or overstates its
     *  effect. */
    description?: ReactNode;
}

export default function ConfirmDestructiveAction({
    open,
    onClose,
    onConfirm,
    title,
    confirmText,
    loading,
    description,
}: ConfirmDestructiveActionProps) {
    const [typed, setTyped] = useState('');

    const handleClose = () => {
        setTyped('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title={title}>
            {description && <div className={styles.confirmDescription}>{description}</div>}
            <div className={styles.confirmWarning}>
                This action cannot be undone. Type &ldquo;{confirmText}&rdquo; to confirm.
            </div>
            <div className={styles.confirmInput}>
                <Input
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`Type ${confirmText} to confirm`}
                    placeholder={confirmText}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                />
            </div>
            <div className={`${styles.wizardActions} ${styles.confirmActions}`}>
                <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button
                    variant="danger"
                    loading={loading}
                    disabled={typed !== confirmText}
                    onClick={onConfirm}
                >
                    Confirm
                </Button>
            </div>
        </Modal>
    );
}
