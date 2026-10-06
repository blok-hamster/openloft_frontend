'use client';

import { useState } from 'react';
import { IAuditLog, approveAction } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import styles from './Dashboard.module.css';

interface HumanApprovalQueueProps {
    logs: IAuditLog[];
    onUpdate: () => void;
}

export default function HumanApprovalQueue({ logs, onUpdate }: HumanApprovalQueueProps) {
    const { toast } = useToast();
    /* Every sibling overlay guards its submit; this one did not, so a
       double-tap on Approve fired two POSTs for the same log. */
    const [busyId, setBusyId] = useState<string | null>(null);

    const pendingLogs = logs.filter((l) => l.status === 'pending');

    const handleApproval = async (logId: string, approved: boolean) => {
        if (busyId !== null) return;
        setBusyId(logId);
        try {
            await approveAction(logId, approved);
            toast(approved ? 'Action approved' : 'Action denied', approved ? 'success' : 'info');
            onUpdate();
        } catch {
            toast('Failed to process approval', 'error');
        } finally {
            setBusyId(null);
        }
    };

    if (pendingLogs.length === 0) return null;

    return (
        <div className={styles.approvalQueue}>
            <div className={`${styles.headerTitle} ${styles.approvalQueueTitle}`}>
                Pending Approvals ({pendingLogs.length})
            </div>
            {pendingLogs.map((log) => {
                const busy = busyId === log._id;
                return (
                    <div key={log._id} className={styles.approvalCard}>
                        <div className={styles.approvalAction}>{log.actionType}</div>
                        <div className={styles.approvalContext}>{log.commandContext}</div>
                        <div className={styles.approvalButtons}>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={busyId !== null}
                                loading={busy}
                                onClick={() => handleApproval(log._id, true)}
                            >
                                Approve
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={busyId !== null}
                                onClick={() => handleApproval(log._id, false)}
                            >
                                Deny
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
