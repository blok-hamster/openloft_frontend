import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import styles from '@/components/landing/Landing.module.css';

export default function LandingPage() {
    return (
        <main className={styles.landingPage}>
            <Header />
            <Hero />
        </main>
    );
}
