import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { PageTransition, AppFooter, AuthRedirectHandler, BackToTop } from '@/components/layout';
import { CustomCursor } from '@/components/layout/custom-cursor';
import { cookies } from 'next/headers';
import type { Locale } from '@/stores/i18n-store';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CodeVN - Where Your Code Finds Its Tribe!',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Note: This is a Server Component; avoid calling hooks here.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
  const initialLocale: Locale =
    cookieLocale === 'en' || cookieLocale === 'vi' ? cookieLocale : 'vi';
  return (
    <html lang={initialLocale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers initialLocale={initialLocale}>
          <AuthRedirectHandler />
          <CustomCursor />
          <PageTransition>
            <div className="flex min-h-screen flex-col pt-16">
              <div className="flex-1">{children}</div>
              <AppFooter />
            </div>
          </PageTransition>
          <BackToTop />
        </Providers>
      </body>
    </html>
  );
}
