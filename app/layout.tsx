import type { Metadata } from 'next';
import { sora } from './fonts';
import '../styles/globals.css';
import { DialogProvider } from '@/components/ui/dialog-provider';

export const metadata: Metadata = {
  title: 'Devya Tasks',
  description: 'Eisenhower-matrix task management for the Devya team',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="antialiased font-sora bg-ink-900 text-ink-100" suppressHydrationWarning>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
