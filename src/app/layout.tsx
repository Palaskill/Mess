import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEss - Bar Bill Tracker',
  description: 'Track and split bar bills with friends',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-slate-900 text-slate-100 flex flex-col antialiased">
        <main className="flex-1 pb-24">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
