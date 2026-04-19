import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Devanagari, Poppins } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";

import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Navbar } from "@/components/navbar";
import { NavbarWrapper } from "@/components/navbar-wrapper";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicAnalyticsEnv } from "@/lib/env";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Toaster } from "sonner";
import { CookieNotice } from "@/components/CookieNotice";
import { CREEDA_LEGAL_ENTITY } from "@/lib/legal/constants";
import { SEO_SCOPE_KEYPHRASES } from "@/lib/seo/marketing-scopes";
import {
  createOrganizationSchema,
  createWebSiteSchema,
} from "@/lib/seo/schema";
import {
  DEFAULT_SOCIAL_IMAGE,
  SITE_ALTERNATE_LOCALES,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
  SITE_TITLE,
  getAbsoluteUrl,
  getBaseUrl,
} from "@/lib/seo/site";

const siteUrl = getBaseUrl();
const {
  googleSiteVerification,
  bingSiteVerification,
  gaMeasurementId,
} = getPublicAnalyticsEnv();

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
  colorScheme: "dark",
  viewportFit: "cover",
  themeColor: SITE_THEME_COLOR,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(siteUrl),
  keywords: [...SEO_SCOPE_KEYPHRASES],
  manifest: "/manifest.webmanifest",
  category: "sports science",
  classification: "Sports science and healthy-living platform",
  referrer: "origin-when-cross-origin",
  creator: CREEDA_LEGAL_ENTITY,
  publisher: CREEDA_LEGAL_ENTITY,
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
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
    title: SITE_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/icons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: SITE_LOCALE,
    alternateLocale: [...SITE_ALTERNATE_LOCALES],
    images: [
      {
        url: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path),
        width: DEFAULT_SOCIAL_IMAGE.width,
        height: DEFAULT_SOCIAL_IMAGE.height,
        alt: DEFAULT_SOCIAL_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE.path)],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={SITE_LANGUAGE} className="dark">
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt" />
        <JsonLd data={createOrganizationSchema()} nonce={nonce} />
        <JsonLd data={createWebSiteSchema()} nonce={nonce} />
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
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={gaMeasurementId} nonce={nonce} />
        </Suspense>
        <Script src="/sw-register.js" strategy="afterInteractive" nonce={nonce} />
      </body>
    </html>
  );
}
