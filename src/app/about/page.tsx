import type { Metadata } from 'next';
import { AboutContent } from '@/components/features/about/about-content';

export const metadata: Metadata = {
  title: 'About • CodeVN',
  description: 'Learn more about CodeVN and our community.',
};

export default function AboutPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <AboutContent />
        </div>
      </div>
    </div>
  );
}
