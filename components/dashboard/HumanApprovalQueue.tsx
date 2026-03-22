'use client';

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

    const pendingLogs = logs.filter((l) => l.status === 'pending');

    const handleApproval = async (logId: string, approved: boolean) => {
        try {
            await approveAction(logId, approved);
            toast(approved ? 'Action approved' : 'Action denied', approved ? 'success' : 'info');
            onUpdate();
        } catch {
            toast('Failed to process approval', 'error');
        }
    };

    if (pendingLogs.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            <div className={styles.headerTitle} style={{ fontSize: 'var(--font-size-sm)' }}>
                Pending Approvals ({pendingLogs.length})
            </div>
            {pendingLogs.map((log) => (
                <div key={log._id} className={styles.approvalCard}>
                    <div className={styles.approvalAction}>{log.actionType}</div>
                    <div className={styles.approvalContext}>{log.commandContext}</div>
                    <div className={styles.approvalButtons}>
                        <Button variant="primary" size="sm" onClick={() => handleApproval(log._id, true)}>
                            Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleApproval(log._id, false)}>
                            Deny
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
