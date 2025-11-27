import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asset Recommender',
  description: 'AI-powered investment recommendations for stocks and cryptocurrency',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

