import './globals.css';
import './styles/espn-style.css';  // Import our ESPN-style CSS
import { SessionProvider } from './providers/SessionProvider';

export const metadata = {
  title: 'March Madness Fantasy 2025',
  description: 'Fantasy competition for March Madness tournament',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
