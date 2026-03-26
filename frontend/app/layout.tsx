import type { Metadata } from 'next';
import { Nunito, Nunito_Sans } from 'next/font/google';
import { ThemedTopLoader } from '@/components/ThemedTopLoader';
import { ThemeProvider } from '@/components/ThemeProvider';
import { NotificationsProvider } from '@/components/NotificationsProvider';
import './globals.css';

const nunitoSans = Nunito_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-nunito-sans',
  display: 'swap',
  adjustFontFallback: false,
});

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'Teno',
  description: 'B2B закупки та переговори',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="uk" suppressHydrationWarning className={`${nunitoSans.variable} ${nunito.variable}`}>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ThemedTopLoader />
          <NotificationsProvider>{children}</NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
