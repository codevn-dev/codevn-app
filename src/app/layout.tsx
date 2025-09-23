import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { PageTransition } from '@/components/layout';
import { CustomCursor } from '@/components/layout/custom-cursor';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CodeVN - Home sweet home for developers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <CustomCursor />
          <PageTransition>
            <div className="flex min-h-screen flex-col pt-16">
              <div className="flex-1">{children}</div>
              <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-500">
                © {new Date().getFullYear()} CodeVN. All rights reserved.
              </footer>
            </div>
          </PageTransition>
        </Providers>
      </body>
    </html>
  );
}
