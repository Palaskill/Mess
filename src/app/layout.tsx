import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import SmoothScroll from '@/components/SmoothScroll';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'MEss - Bar Bill Tracker',
  description: 'Track and split bar bills with friends',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MEss',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('mess-theme') || 'auto';
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = savedTheme === 'dark' || (savedTheme === 'auto' && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }

                  var savedLang = localStorage.getItem('mess-lang') || 'fr';
                  document.documentElement.lang = savedLang;
                  document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-slate-900 text-slate-100 flex flex-col antialiased selection:bg-blue-500/30">
        <a href="#main-content" className="skip-link">Aller au contenu / Skip to content</a>
        <LanguageProvider>
          <SmoothScroll>
            <main id="main-content" className="flex-1 pb-28 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
              {children}
            </main>
            <BottomNav />
          </SmoothScroll>
        </LanguageProvider>
      </body>
    </html>
  );
}
