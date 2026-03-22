import type { Metadata } from 'next';
import NextTopLoader from 'nextjs-toploader';
import './globals.css';
import { NotificationsProvider } from '@/components/NotificationsProvider';

export const metadata: Metadata = {
  title: 'RetailProcure',
  description: 'B2B закупки та переговори',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <NextTopLoader
          color="#4f46e5"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #4f46e5, 0 0 5px #4f46e5"
        />
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </body>
    </html>
  );
}

