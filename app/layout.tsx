import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from './providers/SessionProvider';
import './styles/espn-style.css'; // Updated import path
import './globals.css'; // Keep this if you want to use Tailwind or other global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'March Madness App',
  description: 'Tournament Management Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}