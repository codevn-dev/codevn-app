'use client';

import { FooterVersion } from './footer-version';
import { FooterLinks } from './footer-links';
import { FooterSocial } from './footer-social';
import { FooterCopyright } from './footer-copyright';

export function AppFooter() {
  return (
    <footer className="w-full border-t border-gray-100 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile view - stacked layout */}
        <div className="flex flex-col items-center gap-3 sm:hidden">
          <FooterLinks className="flex-col" />
          <FooterSocial />
          <div className="flex w-full items-center justify-between">
            <FooterCopyright />
            <FooterVersion />
          </div>
        </div>

        {/* Desktop view - side by side layout */}
        <div className="hidden items-center justify-between gap-4 sm:flex">
          <FooterCopyright />
          <div className="flex items-center gap-4">
            <FooterLinks showSeparators />
            <FooterSocial className="gap-2" />
            <FooterVersion />
          </div>
        </div>
      </div>
    </footer>
  );
}
