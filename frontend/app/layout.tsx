import type { Metadata } from 'next';
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
        <NotificationsProvider>
          {children}
        </NotificationsProvider>
      </body>
    </html>
  );
}

