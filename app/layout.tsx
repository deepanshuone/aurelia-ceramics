import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURELIA Ceramics | Crafted for Modern Tables',
  description: 'Premium ceramic crockery for homes, hospitality and modern dining spaces.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
