import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NeuroTrade AI — Real-Time Crypto Analysis',
  description: 'Dapatkan wawasan teknikal dan sinyal pasar kripto secara real-time, ditenagai oleh AI.',
  openGraph: {
    title: 'NeuroTrade AI — Real-Time Crypto Analysis',
    description: 'AI-powered real-time crypto market analysis for smarter trading decisions.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning={true}>
      <body>{children}</body>
    </html>
  );
}
