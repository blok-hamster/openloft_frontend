'use client';

import { useRouter } from 'next/navigation';
import styles from '@/components/dashboard/Dashboard.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { XCircle } from 'lucide-react';

export default function BillingCancelPage() {
    const router = useRouter();

    return (
        <div className={styles.billingContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Card style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
                <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
                    <XCircle size={64} />
                </div>
                <h1 className={styles.headerTitle} style={{ marginBottom: '1rem' }}>Payment Cancelled</h1>
                <p className={styles.headerSubtitle} style={{ marginBottom: '2rem' }}>
                    Your checkout session was cancelled. No charges were made to your account.
                </p>
                <Button variant="primary" fullWidth onClick={() => router.push('/dashboard/billing')}>
                    Return to Billing
                </Button>
            </Card>
        </div>
    );
}
