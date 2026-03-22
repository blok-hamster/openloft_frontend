'use client';

import { useState } from 'react';
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
}

export default function ConfirmDestructiveAction({
    open,
    onClose,
    onConfirm,
    title,
    confirmText,
    loading,
}: ConfirmDestructiveActionProps) {
    const [typed, setTyped] = useState('');

    const handleClose = () => {
        setTyped('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title={title}>
            <div className={styles.confirmWarning}>
                This action cannot be undone. Type &ldquo;{confirmText}&rdquo; to confirm.
            </div>
            <div className={styles.confirmInput}>
                <Input
                    placeholder={confirmText}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                />
            </div>
            <div className={styles.wizardActions} style={{ marginTop: '1rem' }}>
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
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
