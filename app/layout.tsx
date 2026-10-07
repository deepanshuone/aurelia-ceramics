import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Providers from '../components/Providers';
import AnnouncementBar from '../components/AnnouncementBar';
import WhatsAppFloat from '../components/WhatsAppFloat';
import { whatsappLink } from '../lib/business';
import { getNavCategories } from '../lib/nav';
import { getDeliveryRules } from '../lib/store-settings';
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '../lib/site';

// Self-hosted at build time: no render-blocking request to Google Fonts.
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-dm-sans' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  // Makes relative canonical/OG URLs absolute.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'AURELIA Ceramics | Crafted for Modern Tables',
    template: '%s | AURELIA Ceramics',
  },
  description: SITE_DESCRIPTION,
  // Every page canonicalises to itself unless it sets its own (products, catalogue).
  alternates: { canonical: './' },
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
  const delivery = await getDeliveryRules();
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body>
        <Providers delivery={delivery}>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <AnnouncementBar delivery={delivery} />
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
