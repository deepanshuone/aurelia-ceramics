import type { Metadata } from 'next';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Providers from '../components/Providers';
import AnnouncementBar from '../components/AnnouncementBar';
import WhatsAppFloat from '../components/WhatsAppFloat';
import { whatsappLink } from '../lib/business';
import { getNavCategories } from '../lib/nav';
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <AnnouncementBar />
          <Header categories={await getNavCategories()} />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Footer />
          <WhatsAppFloat href={whatsappLink('Hello, I have a question about your ceramic products.')} />
        </Providers>
      </body>
    </html>
  );
}
