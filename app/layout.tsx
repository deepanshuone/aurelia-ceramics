import type { Metadata } from 'next';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Providers from '../components/Providers';
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '../lib/site';

export const metadata: Metadata = {
  // Makes relative canonical/OG URLs absolute.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'AURELIA Ceramics | Crafted for Modern Tables',
    template: '%s | AURELIA Ceramics',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    title: 'AURELIA Ceramics | Crafted for Modern Tables',
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
