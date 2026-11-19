import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Schibsted_Grotesk, Spline_Sans_Mono } from 'next/font/google';
import '@styles/globals.css';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-instrument-serif' });
const ui = Schibsted_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-schibsted-grotesk' });
const data = Spline_Sans_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-spline-sans-mono' });

/** Metadata is static and reveals no configuration or personal data. */
export const metadata: Metadata = {
  title: 'Almanair — winter smog navigator',
  description: 'Low-emission routines, indoor-air hacks and honest impact receipts for families and communities.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  robots: { index: true, follow: true },
};

/** Mobile-first viewport with no remote resources. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF0EB' },
    { media: '(prefers-color-scheme: dark)', color: '#101316' },
  ],
};

/** Root document; all visual state is applied on the client via data attributes. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${data.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
