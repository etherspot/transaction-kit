import type { Metadata } from 'next';
import './globals.css';
import './styles/tailwind.css';

export const metadata: Metadata = {
  title: 'Etherspot Modular SDK with Privy',
  description: 'Etherspot Modular SDK with Privy',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
