"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  GOOGLE_TAG_ID,
  META_PIXEL_ID,
  trackPageView,
} from "../lib/analytics";

// Loads Meta Pixel and the Google tag (see lib/analytics.ts) on the shop.
// Admin pages are skipped so staff visits don't count as shoppers.

export default function AdTracking() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  // The pixel's own snippet reports the first page view; report later
  // client-side navigations here.
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (!isAdmin) trackPageView();
  }, [pathname, isAdmin]);

  if (isAdmin) return null;

  const googleConfig = [GA_MEASUREMENT_ID, GOOGLE_ADS_ID]
    .filter(Boolean)
    .map((id) => `gtag('config', '${id}');`)
    .join("");

  return (
    <>
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');fbq('track', 'PageView');`}
        </Script>
      )}
      {GOOGLE_TAG_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js', new Date());${googleConfig}`}
          </Script>
        </>
      )}
    </>
  );
}
