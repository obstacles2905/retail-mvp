import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="uk">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

