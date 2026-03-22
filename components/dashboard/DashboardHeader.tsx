'use client';

import styles from './Dashboard.module.css';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
    agentCount: number;
    onDeploy: () => void;
}

export default function DashboardHeader({ agentCount, onDeploy }: DashboardHeaderProps) {
    return (
        <div className={styles.dashboardHeader}>
            <div className={styles.headerLeft}>
                <h1 className={styles.headerTitle}>Orchestration</h1>
                <span className={styles.headerSubtitle}>{agentCount} Agent{agentCount !== 1 ? 's' : ''} deployed</span>
            </div>
            <div className={styles.headerActions}>
                <Button variant="primary" icon={<Plus size={14} />} onClick={onDeploy}>
                    New Agent
                </Button>
            </div>
        </div>
    );
}
