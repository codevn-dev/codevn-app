import type { Metadata } from 'next';
import { TermsContent } from '@/components/features/terms/terms-content';

export const metadata: Metadata = {
  title: 'Terms of Service • CodeVN',
  description: 'Terms of Service for CodeVN platform.',
};

export default function TermsPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <TermsContent />
        </div>
      </div>
    </div>
  );
}
