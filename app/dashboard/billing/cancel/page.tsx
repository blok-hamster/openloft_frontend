'use client';

import { useRouter } from 'next/navigation';
import styles from '@/components/dashboard/Dashboard.module.css';
import r from '../BillingResult.module.css';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { XCircle } from 'lucide-react';

export default function BillingCancelPage() {
    const router = useRouter();

    return (
        <div className={`${styles.billingContainer} ${r.resultCenter}`}>
            <Card className={r.resultCard}>
                <div className={r.resultIconSuccess}>
                    <XCircle size={64} aria-hidden="true" />
                </div>
                <h1 className={`${styles.headerTitle} ${r.resultTitle}`}>Payment Cancelled</h1>
                <p className={`${styles.headerSubtitle} ${r.resultBody}`}>
                    Your checkout session was cancelled. No charges were made to your account.
                </p>
                <Button type="button" variant="primary" fullWidth onClick={() => router.push('/dashboard/billing')}>
                    Return to Billing
                </Button>
            </Card>
        </div>
    );
}
