import type { Metadata } from 'next';
import { sora, cairo } from './fonts';
import '../styles/globals.css';
import { DialogProvider } from '@/components/ui/dialog-provider';
import { LocaleProvider } from '@/lib/i18n/client';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleConfig } from '@/lib/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.app.name,
    description: dict.app.description,
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      ],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const { dir } = getLocaleConfig(locale);
  const bodyFont = locale === 'ar' ? 'font-cairo' : 'font-sora';
  return (
    <html lang={locale} dir={dir} className={`${sora.variable} ${cairo.variable}`}>
      <body className={`antialiased ${bodyFont} bg-ink-900 text-ink-100`} suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <DialogProvider>{children}</DialogProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
