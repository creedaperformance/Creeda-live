import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Devanagari, Poppins } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { NavbarWrapper } from "@/components/navbar-wrapper";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { MARKETING_SCOPE_SUMMARY, SEO_SCOPE_KEYPHRASES } from "@/lib/seo/marketing-scopes";
import { Toaster } from "sonner";
import { CookieNotice } from "@/components/CookieNotice";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.creeda.in").replace(/\/+$/, "");
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingSiteVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF5F1F",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Creeda — Digital Sports Scientist for Athletes and Everyday India",
  description:
    "AI-powered guidance for athlete performance, recovery, healthier living, and sport entry. Built for Indian athletes and everyday Indian routines.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  keywords: [...SEO_SCOPE_KEYPHRASES],
  manifest: "/manifest.json",
  category: "sports science",
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(bingSiteVerification ? { other: { "msvalidate.01": bingSiteVerification } } : {}),
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Creeda",
  },
  openGraph: {
    title: "Creeda — Digital Sports Scientist for Athletes and Everyday India",
    description:
      "AI-powered performance and healthy-living guidance for Indian athletes and individuals",
    url: siteUrl,
    siteName: "CREEDA",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/creeda-performance-bgr.png",
        width: 1200,
        height: 630,
        alt: "CREEDA Performance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Creeda — Digital Sports Scientist for Athletes and Everyday India",
    description:
      "AI-powered guidance for athlete performance, recovery, healthier living, and sport entry.",
    images: ["/creeda-performance-bgr.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "marketing-scope": MARKETING_SCOPE_SUMMARY,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CREEDA PERFORMANCE",
    url: siteUrl,
    sameAs: [siteUrl],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "creedaperformance@gmail.com",
        telephone: "+91 9769911923",
        areaServed: "IN",
      },
    ],
  };

  const webSiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CREEDA",
    url: siteUrl,
    description:
      "Digital sports scientist for athlete performance and healthier everyday living.",
    inLanguage: ["en-IN", "hi-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <link rel="alternate" type="text/plain" href="/llms.txt" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteStructuredData),
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${geistMono.variable} ${notoDevanagari.variable} antialiased`}
      >
        <LanguageProvider>
          <NavbarWrapper>
            <Navbar />
          </NavbarWrapper>
          <main className="min-h-[100dvh]">{children}</main>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                background: "var(--card)",
                border: "1px solid var(--border-bright)",
                color: "var(--foreground)",
              },
            }}
          />
          <CookieNotice />
        </LanguageProvider>
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
              if ('serviceWorker' in navigator && !isLocalHost) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => {
                      reg.update();
                      console.log('[SW] Registered:', reg.scope);
                    })
                    .catch(err => console.log('[SW] Registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
