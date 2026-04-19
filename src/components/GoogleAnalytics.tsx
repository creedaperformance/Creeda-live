"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  getCookieChoiceServerSnapshot,
  getCookieChoiceSnapshot,
  subscribeToCookieChoice,
} from "@/lib/cookie-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GoogleAnalyticsProps = {
  measurementId: string;
  nonce?: string;
};

export function GoogleAnalytics({
  measurementId,
  nonce,
}: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasHandledInitialPageView = useRef(false);
  const consentChoice = useSyncExternalStore(
    subscribeToCookieChoice,
    getCookieChoiceSnapshot,
    getCookieChoiceServerSnapshot,
  );

  const searchQuery = searchParams.toString();
  const isEnabled =
    consentChoice === "accepted_all" && measurementId.trim().length > 0;

  useEffect(() => {
    if (
      !isEnabled ||
      typeof window === "undefined" ||
      typeof window.gtag !== "function"
    ) {
      return;
    }

    if (!hasHandledInitialPageView.current) {
      hasHandledInitialPageView.current = true;
      return;
    }

    const pagePath = searchQuery ? `${pathname}?${searchQuery}` : pathname;

    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
    });
  }, [isEnabled, pathname, searchQuery]);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
