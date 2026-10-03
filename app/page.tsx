import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import FrameworkBand from '@/components/landing/FrameworkBand';
import styles from '@/components/landing/Landing.module.css';

export default function LandingPage() {
    return (
        <main className={styles.landingPage}>
            <Header />
            <Hero />
            {/* NMAFC is the product. The agent platform below it is one client. */}
            <FrameworkBand />
        </main>
    );
}