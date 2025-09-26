import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/features/privacy/privacy-content';

export const metadata: Metadata = {
  title: 'Privacy Policy • CodeVN',
  description: 'Privacy Policy for CodeVN platform.',
};

export default function PrivacyPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <PrivacyContent />
        </div>
      </div>
    </div>
  );
}
