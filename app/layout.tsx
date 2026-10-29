import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { NavDrawerProvider } from "@/lib/NavDrawerContext";
import { ToastProvider } from "@/components/ui/Toast";
import { GoogleOAuthProvider } from "@react-oauth/google";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

/* `width=device-width` without a `maximum-scale` — capping zoom breaks
   accessibility, which is worse than the text inflation it prevents. */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

/* The landing page now argues that memory is the product — "Memory is what
   makes an agent an agent" — so the snippet that reaches the browser tab and
   the search result says that too, rather than selling the orchestration
   platform this stopped being. Everything here is stated on the landing page
   already: no benchmark, no audit trail, no compliance badge, no price. */
export const metadata: Metadata = {
  title: {
    /* The landing page argues memory; every other route narrows it through
       the template so document titles never read as one string stamped
       site-wide. */
    default: "OpenLoft — agent memory that outlives the context window",
    template: "%s — OpenLoft",
  },
  description: "NMAFC is an open-source memory layer for agents: dated, decay-aware, source-attributed facts, and a small precise context hundreds of sessions later. OpenLoft hosts the agents that use it.",
  icons: {
    icon: "/loft_favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceMono.variable} suppressHydrationWarning>
      <body>
        {/* Bootstrap, before first paint.

            The hash never leaves the browser — the server has no way to know
            the visitor asked for #hosted-memory — so ProductSections can only
            ever serve the default section in its HTML. Inline at the top of
            the body, so it runs before the rest of the document is parsed,
            this parks the hash on <html> and lets the stylesheet hold the
            switcher until React has committed the section it names. Without
            JS nothing is marked and the default section simply stands. */}
        <script
          id="product-section-bootstrap"
          dangerouslySetInnerHTML={{
            __html:
              "if(window.location.hash)document.documentElement.dataset.productSection=window.location.hash.slice(1)",
          }}
        />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <AuthProvider>
            <NavDrawerProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </NavDrawerProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
